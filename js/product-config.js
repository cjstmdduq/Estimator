// 제품 설정 통합 관리
// 새로운 제품 추가 시 이 파일만 수정하면 됩니다.

// ========== 제품별 설정 ==========

const PRODUCT_CONFIGS = {
  // 따사룸 제품들
  puzzle: {
    vendor: 'ddasaroom',
    name: '퍼즐매트',
    type: 'puzzle',
    calcType: 'hybrid', // 계산 타입
    prices: {
      25: 17900,      // 25T
      '25plus': 22800, // 25T Plus+
      40: 26300       // 40T
    },
    thicknesses: [
      { value: '25', label: '25T' },
      { value: '25plus', label: '25T Plus+' },
      { value: '40', label: '40T' }
    ],
    defaultThickness: '25',
    image: './images/puzzle-mat-placeholder.svg',
    imageReal: './images/product_03.jpg',
    link: 'https://brand.naver.com/ddasaroom/products/5994906898',
    showThermalNotice: false
  },

  babyRoll: {
    vendor: 'ddasaroom',
    name: '유아 롤매트',
    type: 'roll',
    calcType: 'roll',
    rollPrices: {
      12: { 110: 12600, 120: 14900, 125: 14900, 140: 16800 },
      17: { 70: 10700, 110: 13800, 120: 15300, 125: 16100, 140: 18200 },
      22: { 110: 19100, 120: 20900, 125: 20900 }
    },
    widthPriority: {
      70: 2,
      110: 1,
      120: 1,
      125: 3, // 단종 예정
      140: 1
    },
    maxLength: {
      12: 1200, // 12m
      17: 800,  // 8m
      22: 600   // 6m
    },
    thicknesses: [
      { value: '12', label: '12T' },
      { value: '17', label: '17T' },
      { value: '22', label: '22T' }
    ],
    defaultThickness: '17',
    image: './images/roll-mat-placeholder.svg',
    imageReal: './images/product_01.jpg',
    link: 'https://brand.naver.com/ddasaroom/products/6092903705',
    showThermalNotice: true,
    showRollUnits: false
  },

  petRoll: {
    vendor: 'ddasaroom',
    name: '애견 롤매트',
    type: 'roll',
    calcType: 'petRoll',
    rollPrices: {
      6: { 110: 10400, 120: 11900, 125: 11900, 140: 13200 },
      9: { 110: 10900, 120: 12300, 125: 12300, 140: 13500 },
      12: { 110: 12600, 120: 14900, 125: 14900, 140: 16800 }
    },
    widthPriority: {
      110: 1,
      120: 1,
      125: 3, // 단종 예정
      140: 1
    },
    maxLength: {
      6: 1300,  // 13m
      9: 1200,  // 12m
      12: 1200  // 12m
    },
    thicknesses: [
      { value: '6', label: '6T' },
      { value: '9', label: '9T' },
      { value: '12', label: '12T' }
    ],
    defaultThickness: '9',
    image: './images/roll-mat-placeholder.svg',
    imageReal: './images/product_02.jpg',
    link: 'https://brand.naver.com/ddasaroom/products/4200445704',
    showThermalNotice: true,
    showRollUnits: true // 50cm 개수 표시
  },

  // 경쟁사 제품들
  riposoRoll: {
    vendor: 'riposo',
    name: '리포소 롤매트',
    type: 'roll',
    calcType: 'roll',
    competitorFor: 'babyRoll', // 이 제품이 경쟁하는 따사룸 제품
    rollPrices: {
      17: { 80: 10900, 90: 11900, 100: 12900, 110: 13900, 120: 15400, 130: 16400, 135: 17900 }
    },
    widthPriority: {
      80: 2,
      90: 2,
      100: 1,
      110: 1,
      120: 1,
      130: 1,
      135: 2
    },
    maxLength: {
      17: 700 // 7m
    },
    thicknesses: [
      { value: '17', label: '17T' }
    ],
    defaultThickness: '17',
    image: './images/riposo_roll.jpg',
    imageReal: './images/riposo_roll.jpg',
    link: 'https://www.riposo.co.kr',
    showThermalNotice: true,
    showRollUnits: false
  },

  parklonRoll: {
    vendor: 'parklon',
    name: '파크론 롤매트',
    type: 'roll',
    calcType: 'roll',
    competitorFor: 'babyRoll',
    rollPrices: {
      17: { 50: 10950, 60: 12950, 70: 14950, 80: 16950, 90: 18450, 100: 19950, 110: 21950, 120: 23950, 130: 25950, 140: 28450, 150: 29950 },
      22: { 50: 12450, 100: 24450, 110: 27450, 120: 31450, 130: 33450, 140: 35450, 150: 37450 }
    },
    widthPriority: {
      50: 2,
      60: 2,
      70: 2,
      80: 2,
      90: 2,
      100: 1,
      110: 1,
      120: 1,
      130: 1,
      140: 1,
      150: 1
    },
    maxLength: {
      17: 700, // 7m
      22: 500  // 5m
    },
    thicknesses: [
      { value: '17', label: '17T' },
      { value: '22', label: '22T' }
    ],
    defaultThickness: '17',
    image: './images/parkron_roll.jpg',
    imageReal: './images/parkron_roll.jpg',
    link: 'https://www.parklon.co.kr',
    showThermalNotice: true,
    showRollUnits: false
  },

  tgoRoll: {
    vendor: 'tgo',
    name: '티지오 롤매트',
    type: 'roll',
    calcType: 'roll',
    competitorFor: 'babyRoll',
    rollPrices: {
      10: { 110: 10900, 140: 13900 },
      14: { 50: 10900, 100: 12900, 110: 13900, 125: 15900, 140: 17900, 150: 26900 },
      24: { 110: 19900, 125: 21400, 140: 22900, 150: 30900 },
      34: { 110: 24900, 140: 28900 }
    },
    widthPriority: {
      50: 2,
      100: 1,
      110: 1,
      125: 1,
      140: 1,
      150: 1
    },
    maxLength: {
      10: 1000, // 10m
      14: 1000, // 10m
      24: 1000, // 10m
      34: 1000  // 10m
    },
    thicknesses: [
      { value: '10', label: '10T' },
      { value: '14', label: '14T' },
      { value: '24', label: '24T' },
      { value: '34', label: '34T' }
    ],
    defaultThickness: '14',
    image: './images/tgo_roll.jpg',
    imageReal: './images/tgo_roll.jpg',
    link: 'https://www.tgo.co.kr',
    showThermalNotice: true,
    showRollUnits: false
  }
};

// ========== 제품 매칭 관계 ==========

/**
 * 특정 제품에 대응하는 경쟁사 제품 목록 가져오기
 */
function getCompetitorProducts(productId) {
  return Object.entries(PRODUCT_CONFIGS)
    .filter(([_, config]) => config.competitorFor === productId)
    .map(([id, _]) => id);
}

// ========== 헬퍼 함수 ==========

/**
 * 제품 설정 가져오기
 */
function getProductConfig(productId) {
  return PRODUCT_CONFIGS[productId] || null;
}

/**
 * 롤매트 가격 가져오기
 */
function getRollPrice(productId, thickness, width) {
  const config = getProductConfig(productId);
  if (!config || !config.rollPrices) return null;

  const thicknessKey = parseInt(thickness);
  return config.rollPrices[thicknessKey]?.[width] || null;
}

/**
 * 사용 가능한 롤매트 폭 목록 가져오기
 */
function getAvailableWidths(productId, thickness) {
  const config = getProductConfig(productId);
  if (!config || !config.rollPrices) return [];

  const thicknessKey = parseInt(thickness);
  const widths = Object.keys(config.rollPrices[thicknessKey] || {}).map(Number);
  return widths.sort((a, b) => a - b);
}

/**
 * 폭 우선순위 가져오기
 */
function getWidthPriority(productId, width) {
  const config = getProductConfig(productId);
  if (!config || !config.widthPriority) return 2; // 기본값

  return config.widthPriority[width] ?? 2;
}

/**
 * 최대 롤 길이 가져오기
 */
function getMaxRollLength(productId, thickness) {
  const config = getProductConfig(productId);
  if (!config || !config.maxLength) return Infinity;

  const thicknessKey = parseInt(thickness);
  return config.maxLength[thicknessKey] || Infinity;
}

/**
 * 퍼즐매트 가격 가져오기
 */
function getPuzzlePrice(productId, thickness) {
  const config = getProductConfig(productId);
  if (!config || !config.prices) return null;

  return config.prices[thickness] || null;
}

/**
 * 제품이 롤매트인지 확인
 */
function isRollProduct(productId) {
  const config = getProductConfig(productId);
  return config && config.type === 'roll';
}

/**
 * 제품이 퍼즐매트인지 확인
 */
function isPuzzleProduct(productId) {
  const config = getProductConfig(productId);
  return config && config.type === 'puzzle';
}

/**
 * 모든 제품 ID 목록 가져오기
 */
function getAllProductIds() {
  return Object.keys(PRODUCT_CONFIGS);
}

/**
 * 벤더별 제품 목록 가져오기
 */
function getProductsByVendor(vendor) {
  return Object.entries(PRODUCT_CONFIGS)
    .filter(([_, config]) => config.vendor === vendor)
    .map(([id, _]) => id);
}
