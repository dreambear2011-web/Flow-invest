/**
 * invest-bot.js
 * 지아세 "오늘의 투자운" 텔레그램 봇 (§59 — 별도 봇/별도 BotFather 토큰).
 *
 * 흐름:
 *  /start    → 생년월일 입력(②유형+십성 산출용) → 가입 완료 + 즉시 샘플 발송
 *  매일 발송(기본 07:30 KST — 장 시작 전, "오늘의 나"와 시간대 분리해 톤 중복 방지)
 *  /오늘투자  → 즉시 확인
 *  /stop     → 수신 거부
 *  /privacy  → 개인정보 처리 + 법적 고지
 *
 * ⚠️ 법적 경계선(§59-1, 절대 규칙): 종목·코인명·매수매도 시그널 절대 금지.
 *    자산군은 항상 카테고리명만(예: "성장 계열"). 모든 발송에 면책 문구 고정 동봉.
 *
 * 의존 파일(같은 폴더에 위치): bornbone_today.js (오늘의 나 봇과 동일 파일 복사),
 *   sipseong.js (오늘의 나 봇과 동일 파일 공유), assetMapping.js, investPhrases.js, storage.js
 * 의존 패키지: dotenv, node-cron, node-telegram-bot-api, lunar-javascript
 *
 * 실행 전: npm install && cp .env.example .env (INVEST_BOT_TOKEN 입력) 후 npm start
 */

'use strict';
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const { todayFortune } = require('./bornbone_today');
const { getTodayDomain } = require('./sipseong');
const { getMacroLine, getAssetAreaLine } = require('./assetMapping');
const { pickAdvice, pickHealMsg, DISCLAIMER } = require('./investPhrases');
const { upsertUser, getUser, removeUser, getAllUsers } = require('./storage');

const TOKEN = process.env.INVEST_BOT_TOKEN;
if (!TOKEN) {
  console.error('INVEST_BOT_TOKEN이 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const GLYPH_PATH = './invest-mark.png'; // 레이키 초크레이+높은음자리표+달러 결합 글리프 (파일 직접 배치 필요)

const bot = new TelegramBot(TOKEN, { polling: true });
const pending = new Map(); // chatId → 'awaiting_birthdate'

// 위기 개입 트리거 — 모드·상태 무관 항상 최우선 (지아세 전 채널 공통 규칙)
const CRISIS_KEYWORDS = ['죽고 싶다', '죽고싶다', '사라지고 싶다', '사라지고싶다', '끝내고 싶다', '끝내고싶다', '살기 싫다', '살기싫다'];
const CRISIS_MESSAGE =
  '지금 많이 힘드신 것 같습니다.\n' +
  '투자 손실이든 다른 이유든, 혼자 감당하지 않으셔도 됩니다.\n\n' +
  '자살예방상담전화 1393\n정신건강위기상담전화 1577-0199\n24시간 연결됩니다.';

function containsCrisisKeyword(text) {
  if (!text) return false;
  return CRISIS_KEYWORDS.some(k => text.includes(k));
}

/**
 * §59-7 5단 구조 메시지 빌드 — v2: ①~④ 번호 제거, 흐름형 문장으로 전환.
 * "오늘의 나"(bot.js)와 동일한 톤으로 통일.
 * macro.text(assetMapping.js v2)가 이미 오행×유형별로 풀어쓴 완성 문장이라
 * 별도 "결로 들어옵니다" 연결구는 생략 — 대신 자연스러운 흐름 멘트(TYPE_FLOW)만 덧붙임.
 * areaLine/advice/healMsg는 기존 모듈 결과를 그대로 사용.
 * ⑤ 글리프·캡션 분리 발송은 sendDailyInvest()에서 변경 없이 그대로 처리.
 */
const TYPE_FLOW = {
  A: '무리하게 밀어붙이기보다 한 박자 늦추는 쪽이 오늘의 결을 지키는 방법입니다.',
  B: '무리해서 흔들어 깨우지 않아도 괜찮은 흐름입니다.',
  C: '애써 누르지 않아도 자연스럽게 흘러가는 하루입니다.'
};

function buildInvestParts(user) {
  const { birthYear, birthMonth, birthDay } = user;
  const r = todayFortune(birthYear); // { type: 'A'|'B'|'C', ... } — bornbone_today.js 재사용
  const macro = getMacroLine(r.type);
  const areaLine = getAssetAreaLine(macro.ohang);
  const advice = pickAdvice(r.type);
  const healMsg = pickHealMsg(r.type);
  const flow = TYPE_FLOW[r.type] || TYPE_FLOW.B;

  // 십성 재물 영역 — 생년월일 전체가 있어야 산출 가능. 연도만 있는 기존 가입자는 생략.
  const domain = getTodayDomain(birthYear, birthMonth, birthDay, new Date(), 'invest');
  const domainLine = domain
    ? ` 당신에게는 오늘 특히 ${domain.label}로 그 흐름이 닿습니다.`
    : '';

  const text =
    `🌅 오늘의 투자운\n\n` +
    `${macro.text} ${flow}${domainLine}\n\n` +
    `${areaLine} ${advice}\n`;

  return { text, healMsg };
}

async function sendDailyInvest(chatId, user) {
  const { text, healMsg } = buildInvestParts(user);
  await bot.sendMessage(chatId, text);
  // ⑤ 힐링 단계만 글리프 이미지와 함께 분리 발송 — "마무리 도장" 효과
  await bot.sendPhoto(chatId, GLYPH_PATH, {
    caption: `${healMsg}\n\n${DISCLAIMER}`
  });
}

// ── /start : 온보딩 ──
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const existing = getUser(chatId);
  if (existing && existing.birthYear) {
    bot.sendMessage(chatId, '이미 가입되어 있습니다. /오늘투자 로 바로 확인하실 수 있어요. (다시 설정하려면 /stop 후 /start)');
    return;
  }
  pending.set(chatId, 'awaiting_birthdate');
  bot.sendMessage(chatId,
    '안녕하세요, 지아세 知我世 — 오늘의 투자운입니다 🙂\n' +
    '매일 아침, 오늘의 흐름과 자산군 분위기를 짧게 전해드립니다.\n\n' +
    `${DISCLAIMER}\n\n` +
    '생년월일을 숫자 8자리로 보내주세요. (예: 19901225)'
  );
});

// 8자리 생년월일 문자열 파싱 + 범위 검증
function parseBirthdate(text) {
  const t = text.trim();
  if (!/^\d{8}$/.test(t)) return null;
  const year = +t.slice(0, 4);
  const month = +t.slice(4, 6);
  const day = +t.slice(6, 8);
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

// ── /오늘투자 : 즉시 확인 ──
bot.onText(/\/오늘투자/, async (msg) => {
  const chatId = msg.chat.id;
  const user = getUser(chatId);
  if (!user || !user.birthYear) {
    bot.sendMessage(chatId, '먼저 /start 로 가입해주세요.');
    return;
  }
  await sendDailyInvest(chatId, user);
});

// ── /stop : 수신 거부 ──
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  removeUser(chatId);
  pending.delete(chatId);
  bot.sendMessage(chatId, '수신이 해지되었습니다. 언제든 /start 로 다시 시작하실 수 있어요.');
});

// ── /privacy : 개인정보 처리 + 법적 고지 ──
bot.onText(/\/privacy/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '수집 항목: 출생연도, 텔레그램 chat ID만 저장합니다.\n' +
    '용도: 매일 발송 콘텐츠 개인화 목적 외 사용하지 않습니다.\n' +
    '삭제: /stop 시 즉시 파기됩니다.\n\n' +
    `${DISCLAIMER}\n` +
    '본 서비스는 유사투자자문업에 해당하지 않으며, 특정 금융투자상품에 대한 ' +
    '투자판단·매수매도 시그널을 제공하지 않습니다.'
  );
});

// ── 온보딩 진행 + 위기개입 키워드 감지 ──
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  if (containsCrisisKeyword(text)) {
    bot.sendMessage(chatId, CRISIS_MESSAGE);
    return;
  }

  if (pending.get(chatId) === 'awaiting_birthdate') {
    const parsed = parseBirthdate(text);
    if (!parsed) {
      bot.sendMessage(chatId, '생년월일을 숫자 8자리로 다시 보내주세요. (예: 19901225)');
      return;
    }
    const newUser = {
      birthYear: parsed.year,
      birthMonth: parsed.month,
      birthDay: parsed.day,
      joinedAt: new Date().toISOString()
    };
    upsertUser(chatId, newUser);
    pending.delete(chatId);
    bot.sendMessage(chatId, '가입이 완료되었습니다. 매일 아침 7시 30분에 전해드릴게요 🙂\n\n오늘의 흐름을 먼저 보여드릴게요 —');
    sendDailyInvest(chatId, newUser).catch(err => console.error('샘플 발송 실패:', err.message));
  }
});

// ── 매일 07:30(KST) 전체 가입자 발송 — "오늘의 나"(07:00)와 시간대 분리 ──
cron.schedule('30 7 * * *', () => {
  const users = getAllUsers();
  Object.entries(users).forEach(([chatId, u]) => {
    if (!u || !u.birthYear) return;
    sendDailyInvest(chatId, u).catch(err => {
      console.error(`발송 실패 (chatId=${chatId}):`, err.message);
    });
  });
  console.log(`[${new Date().toISOString()}] 투자운 일일 발송 완료 — 대상 ${Object.keys(users).length}명`);
}, { timezone: 'Asia/Seoul' });

console.log('지아세 오늘의 투자운 봇 — 실행 중');
