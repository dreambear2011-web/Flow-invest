/**
 * investPhrases.js
 * "오늘의 투자운" ④ 조언 + ⑤ 힐링·정화 카피뱅크.
 * §59-4 고정 어휘만 사용: 소량 진입 / 비중 추가 / 고레버리지 절대 금지 /
 * 손절선 우선 확정 / 반익절 고려 / 지나친 분산투자 금지.
 * → 포지션 관리 행동으로만 한정. 종목·자산명 절대 미언급(법적 경계선 §59-1).
 */

'use strict';

const ADVICE_BY_TYPE = {
  // C = 확장(생기·비화)
  C: [
    '소량 진입 정도는 시도해볼 결입니다. 단, 손절선은 진입 전에 먼저 정해두세요. ' +
      '비중을 늘리더라도 나눠서 들어가시고, 고레버리지는 늘 금지입니다.'
  ],
  // A = 마찰(살기·사기)
  A: [
    '신규 진입은 오늘은 쉬어가는 게 맞습니다. 특히 레버리지는 절대 금지. ' +
      '이미 들어간 자리는 손절선 다시 한번 확인만 하세요.'
  ],
  // B = 정체(퇴기 + 입중궁·오황·암검 안전흡수)
  B: [
    '욕심내지 말고 반익절도 고려해볼 시점입니다. 다 먹으려는 마음이 오늘은 독이 됩니다. ' +
      '지나친 분산투자도 오늘은 피하세요.'
  ]
};

const HEAL_BY_TYPE = {
  C: [
    '잘 될 것 같은 날엔 오히려 과해지기 쉽습니다. 들어가기 전 숨 한 번, 그게 오늘의 전략입니다.'
  ],
  A: [
    '오늘 못 들어간 것은 손해가 아니라 지킨 것입니다. 시장은 내일도 열립니다.'
  ],
  B: [
    '절반만 챙겨도 충분합니다. 끝까지 쥐고 있다가 후회하는 것보다, ' +
      '지금 일부 정리하고 마음이 가벼운 게 더 큰 수익입니다.'
  ]
};

const DISCLAIMER = '※ 본 콘텐츠는 특정 종목·자산 추천이 아닌 성향·심리 진단 참고용입니다.';

function pickAdvice(type) {
  const list = ADVICE_BY_TYPE[type] || ADVICE_BY_TYPE.B;
  return list[Math.floor(Math.random() * list.length)];
}

function pickHealMsg(type) {
  const list = HEAL_BY_TYPE[type] || HEAL_BY_TYPE.B;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { pickAdvice, pickHealMsg, DISCLAIMER };
