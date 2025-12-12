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
  6: { 110: 10400, 120: 11900, 125: 11900, 140: 13200 },
  9: { 110: 10900, 120: 12300, 125: 12300, 140: 13500 },
  12: { 110: 12600, 120: 14900, 125: 14900, 140: 16800 },
  14: { 110: 13600, 120: 15600, 125: 15600, 140: 17800 },
  17: { 70: 10700, 110: 13800, 120: 15300, 125: 16100, 140: 18200 },
  22: { 110: 19100, 120: 20900, 125: 20900 }
};



// 롤매트 폭 우선순위
const ROLL_WIDTH_PRIORITY = {
  70: 2,   // 다음 우선순위
  110: 1,  // 높은 우선순위
  120: 1,  // 높은 우선순위
  125: 3,  // 최하위 우선순위 (단종 예정)
  140: 1   // 높은 우선순위
};



// 롤매트 두께별 최대 길이 (cm)
const ROLL_MAX_LENGTH = {
  6: 1300,   // 13m
  9: 1200,   // 12m
  12: 1200,  // 12m
  14: 1000,  // 10m
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
