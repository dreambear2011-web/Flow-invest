/**
 * assetMapping.js
 * "오늘의 투자운" — ① 거시 흐름(오늘 일진 오행) + ③ 오늘의 영역(자산군) 산출.
 * §59-2 자산군↔오행 매핑 테이블 그대로 적용. lunar-javascript로 오늘 일진 천간 산출.
 *
 * ※ 법적 경계선(§59-1): 자산군은 항상 카테고리명만. 종목·코인명 절대 사용 금지.
 */

'use strict';
const { Solar } = require('lunar-javascript');

const GAN_KR = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
};

const GAN_OH = {
  갑: '木', 을: '木', 병: '火', 정: '火', 무: '土',
  기: '土', 경: '金', 신: '金', 임: '水', 계: '水'
};

// §59-2 자산군 ↔ 오행 매핑 (카테고리명만 — 종목·코인명 절대 미사용)
const OH_TO_ASSET = {
  木: '성장 계열',
  火: '에너지 계열',
  土: '실물·안정 계열',
  金: '금융·경화 계열',
  水: '유동성 계열'
};

// 유형(A/B/C)별 거시 서술 어미 — bornbone_today.js와 동일 유형 라벨 재사용
const MACRO_VERB = {
  A: '부딪히는',   // 마찰
  B: '고이는',     // 정체
  C: '강하게 도는' // 확장
};

function getTodayOhang(date = new Date()) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const ganHanja = lunar.getDayGan();
  const ganKr = GAN_KR[ganHanja] || ganHanja;
  return GAN_OH[ganKr];
}

/**
 * ① 거시 흐름 한 줄.
 */
function getMacroLine(type, date = new Date()) {
  const oh = getTodayOhang(date);
  const verb = MACRO_VERB[type] || MACRO_VERB.B;
  return { ohang: oh, text: `오늘은 ${oh}기운이 ${verb} 날입니다.` };
}

/**
 * ③ 오늘의 영역(자산군) 한 줄.
 */
function getAssetAreaLine(ohang) {
  const asset = OH_TO_ASSET[ohang];
  return `오늘은 특히 '${asset}' 자산군이 활성화됩니다.`;
}

module.exports = { getTodayOhang, getMacroLine, getAssetAreaLine, OH_TO_ASSET };
