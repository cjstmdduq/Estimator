// 가격 정보 (하위 호환성을 위해 유지)
// 새로운 제품 추가는 product-config.js에서 하세요!

// 퍼즐매트 가격 정보 (100×100cm 1pcs 기준)
const PUZZLE_PRICES = {
  25: 17900,      // 25T
  '25plus': 22800, // 25T Plus+
  40: 26300       // 40T
};

// 롤매트 가격 정보 (50cm 기준, 두께별/폭별)
const ROLL_PRICES = {
  6:  { 110: 10900, 120: 11900, 140: 13900 },
  9:  { 110: 11900, 120: 12900, 140: 14900 },
  12: { 110: 13450, 120: 15450, 140: 17450 },
  17: { 70: 11900, 110: 13950, 120: 15450, 140: 18450 },
  22: { 110: 19450, 120: 20950 }
};



// 롤매트 폭 우선순위
const ROLL_WIDTH_PRIORITY = {
  70: 2,   // 다음 우선순위
  110: 1,  // 높은 우선순위
  120: 1,  // 높은 우선순위
  140: 1   // 높은 우선순위
};



// 롤매트 두께별 최대 길이 (cm)
const ROLL_MAX_LENGTH = {
  6: 1300,   // 13m
  9: 1200,   // 12m
  12: 1200,  // 12m
  17: 800,   // 8m
  22: 600    // 6m
};



// ========== 헬퍼 함수 (리팩토링 버전) ==========

/**
 * 롤매트 폭 우선순위 가져오기
 * @deprecated 대신 product-config.js의 getWidthPriority() 사용 권장
 */
function getRollWidthPriority(width, thickness, productType) {
  if (typeof getWidthPriority === 'function') {
    return getWidthPriority(productType, width);
  }


  return ROLL_WIDTH_PRIORITY[width] ?? 2;
}
