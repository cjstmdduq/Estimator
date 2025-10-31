(function () {
  const KRW = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

  const $addSpace = document.getElementById('add-space');
  const $copyEstimate = document.getElementById('copy-estimate');
  const $copyShippingMemo = document.getElementById('copy-shipping-memo');
  const $purchaseLink = document.getElementById('purchase-link');
  const $spacesContainer = document.getElementById('spaces-container');
  const $totalPcs = document.getElementById('total-pcs');
  const $totalPrice = document.getElementById('total-price');
  const $totalComposition = document.getElementById('total-composition');
  const $calcModeSection = document.querySelector('.calc-mode-card') || document.querySelector('[data-calc-mode-section]');

  // 퍼즐매트 가격 정보 (100×100cm 1pcs 기준)
  const PUZZLE_PRICES = {
    25: 17900,      // 25T
    '25plus': 21900, // 25T Plus+
    40: 25300       // 40T
  };

  // 롤매트 가격 정보 (50cm 기준, 두께별/폭별)
  const ROLL_PRICES = {
    6: { 110: 10400, 125: 11900, 140: 13200 },
    9: { 110: 10900, 125: 12300, 140: 13500 },
    12: { 110: 12600, 125: 14500, 140: 16800 },
    14: { 110: 13600, 125: 15600, 140: 17800 },
    17: { 70: 10700, 110: 13800, 125: 16100, 140: 18200 },
    22: { 110: 19100, 125: 20900 }
  };

  // 롤매트 폭 우선순위
  const ROLL_WIDTH_PRIORITY = {
    70: 3,   // 낮은 우선순위
    110: 1,  // 높은 우선순위
    120: 3,  // 낮은 우선순위
    125: 2,  // 중간 우선순위
    140: 1   // 높은 우선순위
  };

  function getRollWidthPriority(width, thickness) {
    let priority = ROLL_WIDTH_PRIORITY[width] ?? 2;
    if (thickness === 17 && width === 70) {
      priority += 2;
    }
    return priority;
  }

  // 롤매트 두께별 최대 길이 (cm)
  const ROLL_MAX_LENGTH = {
    6: 1300,   // 13m
    9: 1200,   // 12m
    12: 1200,  // 12m
    14: 1000,  // 10m
    17: 800,   // 8m
    22: 600    // 6m
  };

  // 보완 옵션 임계치(부족폭 cm 이상이면 추가 롤 제안)
  const COMPLEMENT_GAP_THRESHOLD_CM = 15;
  // 보완 시 선호 폭 순서 (사용 가능 폭과 교집합 적용)
  const PREFERRED_COMPLEMENT_WIDTHS = [110, 125, 140, 70];

  // 고객 선호 폭 선택 규칙 (폭 기준, cm)
  const PREFERRED_WIDTH_RULES = [
    { min: 150, max: 170, prefer: [{ width: 110, count: 2, mode: 'exact' }] },
    { min: 180, max: 190, prefer: [{ width: 110, count: 2, mode: 'exact' }] }
  ];

  // 정확(≥) 조합에서 허용하는 최대 과충족(cm)
  const EXACT_OVERAGE_CAP_CM = 20;
  // 대체 조합 탐색 시 허용할 최대 과충족(cm)
  const EXTENDED_EXACT_OVERAGE_CAP_CM = 80;
  // 길이 방향 여유/부족 허용 임계치(cm)
  const LENGTH_RELAXATION_THRESHOLD_CM = 20;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function createPuzzleVisualization(spaceWidth, spaceHeight, coverageWidth, coverageHeight, result) {
    const minorGrid = 10;
    const majorGrid = 50;
    const tiles = [];

    // Hybrid 매트인 경우 (100cm + 50cm 조합)
    if (result && result.n100x !== undefined && result.n100y !== undefined) {
      const n100x = result.n100x;
      const n100y = result.n100y;
      const remainX = coverageWidth - (n100x * 100);
      const remainY = coverageHeight - (n100y * 100);

      // 1. 100cm 타일 영역 (메인 영역)
      for (let y = 0; y < n100y; y++) {
        for (let x = 0; x < n100x; x++) {
          tiles.push({
            x: x * 100,
            y: y * 100,
            width: 100,
            height: 100,
            size: 100
          });
        }
      }

      // 2. 오른쪽 세로 띠 (50cm 타일)
      if (remainX > 0 && n100y > 0) {
        const stripHeight = n100y * 100;
        const cols50 = Math.ceil(remainX / 50);
        const rows50 = Math.ceil(stripHeight / 50);
        for (let y = 0; y < rows50; y++) {
          for (let x = 0; x < cols50; x++) {
            const tileX = (n100x * 100) + (x * 50);
            const tileY = y * 50;
            const tileWidth = Math.min(50, coverageWidth - tileX);
            const tileHeight = Math.min(50, stripHeight - tileY);
            if (tileWidth > 0 && tileHeight > 0) {
              tiles.push({ x: tileX, y: tileY, width: tileWidth, height: tileHeight, size: 50 });
            }
          }
        }
      }

      // 3. 아래쪽 가로 띠 (50cm 타일)
      if (n100x > 0 && remainY > 0) {
        const stripWidth = n100x * 100;
        const cols50 = Math.ceil(stripWidth / 50);
        const rows50 = Math.ceil(remainY / 50);
        for (let y = 0; y < rows50; y++) {
          for (let x = 0; x < cols50; x++) {
            const tileX = x * 50;
            const tileY = (n100y * 100) + (y * 50);
            const tileWidth = Math.min(50, stripWidth - (x * 50));
            const tileHeight = Math.min(50, coverageHeight - tileY);
            if (tileWidth > 0 && tileHeight > 0) {
              tiles.push({ x: tileX, y: tileY, width: tileWidth, height: tileHeight, size: 50 });
            }
          }
        }
      }

      // 4. 오른쪽 아래 모서리 (50cm 타일)
      if (remainX > 0 && remainY > 0) {
        const cols50 = Math.ceil(remainX / 50);
        const rows50 = Math.ceil(remainY / 50);
        for (let y = 0; y < rows50; y++) {
          for (let x = 0; x < cols50; x++) {
            const tileX = (n100x * 100) + (x * 50);
            const tileY = (n100y * 100) + (y * 50);
            const tileWidth = Math.min(50, coverageWidth - tileX);
            const tileHeight = Math.min(50, coverageHeight - tileY);
            if (tileWidth > 0 && tileHeight > 0) {
              tiles.push({ x: tileX, y: tileY, width: tileWidth, height: tileHeight, size: 50 });
            }
          }
        }
      }
    } else {
      // 50cm 또는 100cm 단일 타일 (기존 로직)
      const tileSize = (result && result.nx && coverageWidth / result.nx >= 100) ? 100 : 50;
      const cols = Math.max(1, Math.ceil(coverageWidth / tileSize));
      const rows = Math.max(1, Math.ceil(coverageHeight / tileSize));

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tileX = x * tileSize;
          const tileY = y * tileSize;
          const tileWidth = Math.min(tileSize, coverageWidth - tileX);
          const tileHeight = Math.min(tileSize, coverageHeight - tileY);
          if (tileWidth > 0 && tileHeight > 0) {
            tiles.push({ x: tileX, y: tileY, width: tileWidth, height: tileHeight, size: tileSize });
          }
        }
      }
    }

    return {
      type: 'puzzle',
      space: { width: spaceWidth, height: spaceHeight },
      coverage: { width: coverageWidth, height: coverageHeight },
      tiles,
      gridMinor: minorGrid,
      gridMajor: majorGrid
    };
  }

  function createRollVisualization(spaceWidth, spaceHeight, result) {
    const { coverageWidth = spaceWidth, coverageHeight = spaceHeight, solutions = [], widthAxis, rollLength, splitCount = 1 } = result;
    if (!solutions || solutions.length === 0) return null;

    const stripes = [];
    // 길이 방향 실제 롤 길이 (분할 고려)
    const actualRollLength = rollLength || (widthAxis === 'width' ? coverageHeight : coverageWidth);

    if (widthAxis === 'width') {
      // 가로로 폭이 나열되고, 세로가 길이 방향
      let offsetX = 0;
      solutions.forEach(sol => {
        for (let i = 0; i < sol.count; i++) {
          // splitCount만큼 세로로 분할하여 표시
          for (let split = 0; split < splitCount; split++) {
            stripes.push({
              x: offsetX,
              y: split * actualRollLength,
              width: sol.width,
              height: actualRollLength,
              label: `${sol.width}cm`
            });
          }
          offsetX += sol.width;
        }
      });
    } else {
      // 세로로 폭이 나열되고, 가로가 길이 방향
      let offsetY = 0;
      solutions.forEach(sol => {
        for (let i = 0; i < sol.count; i++) {
          // splitCount만큼 가로로 분할하여 표시
          for (let split = 0; split < splitCount; split++) {
            stripes.push({
              x: split * actualRollLength,
              y: offsetY,
              width: actualRollLength,
              height: sol.width,
              label: `${sol.width}cm`
            });
          }
          offsetY += sol.width;
        }
      });
    }

    return {
      type: 'roll',
      space: { width: spaceWidth, height: spaceHeight },
      coverage: { width: coverageWidth, height: coverageHeight },
      stripes,
      widthAxis,
      gridMinor: 10,
      gridMajor: 50
    };
  }

  function createVisualizationData(spaceType, spaceWidth, spaceHeight, result) {
    if (!result) return null;
    if (spaceType === 'roll' || spaceType === 'petRoll') {
      return createRollVisualization(spaceWidth, spaceHeight, result);
    }
    return createPuzzleVisualization(spaceWidth, spaceHeight, result.coverageWidth ?? spaceWidth, result.coverageHeight ?? spaceHeight, result);
  }

  let spaceCounter = 0;
  const spaces = [];
  let lastCalculationResults = [];  // 마지막 계산 결과 저장

  let currentProduct = 'puzzle';
  let currentThickness = '25';  // 기본 두께

  // 제품 정보 설정
  const PRODUCTS = {
    puzzle: {
      name: '퍼즐매트',
      image: './images/puzzle-mat-placeholder.svg',
      imageReal: './images/product_03.jpg',
      description: '두께 선택: 25T / 25T Plus+ / 40T',
      link: 'https://brand.naver.com/ddasaroom/products/5994906898'
    },
    babyRoll: {
      name: '유아 롤매트',
      image: './images/roll-mat-placeholder.svg',
      imageReal: './images/product_01.jpg',
      description: '두께 선택: 12T / 14T / 17T / 22T',
      link: 'https://brand.naver.com/ddasaroom/products/6092903705'
    },
    petRoll: {
      name: '애견 롤매트',
      image: './images/roll-mat-placeholder.svg',
      imageReal: './images/product_02.jpg',
      description: '두께 선택: 6T / 9T / 12T',
      link: 'https://brand.naver.com/ddasaroom/products/4200445704'
    }
  };


  // 두께 선택 UI 업데이트
  function updateThicknessSelector() {
    const $thicknessSelector = document.getElementById('thickness-selector');

    let thicknesses = [];

    if (currentProduct === 'puzzle') {
      thicknesses = [
        { value: '25', label: '25T' },
        { value: '25plus', label: '25T Plus+' },
        { value: '40', label: '40T' }
      ];
      currentThickness = currentThickness || '25';
    } else if (currentProduct === 'babyRoll') {
      thicknesses = [
        { value: '12', label: '12T' },
        { value: '14', label: '14T' },
        { value: '17', label: '17T' },
        { value: '22', label: '22T' }
      ];
      currentThickness = ['12', '14', '17', '22'].includes(currentThickness) ? currentThickness : '12';
    } else if (currentProduct === 'petRoll') {
      thicknesses = [
        { value: '6', label: '6T' },
        { value: '9', label: '9T' },
        { value: '12', label: '12T' }
      ];
      currentThickness = ['6', '9', '12'].includes(currentThickness) ? currentThickness : '9';
    }

    // 두께 버튼 생성
    $thicknessSelector.innerHTML = thicknesses.map(t =>
      `<button class="thickness-btn ${t.value === currentThickness ? 'active' : ''}" data-thickness="${t.value}">${t.label}</button>`
    ).join('');

    // 이벤트 리스너 등록
    document.querySelectorAll('.thickness-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentThickness = btn.dataset.thickness;
        updateThicknessSelector();
        calculate();
      });
    });
  }

  // 제품 정보 업데이트 함수
  function updateProductDisplay(productType) {
    const product = PRODUCTS[productType];
    if (!product) return;

    currentProduct = productType;

    // 제품에 따라 기본 두께 설정
    if (productType === 'puzzle') {
      currentThickness = '25';  // 퍼즐매트 기본: 25T
    } else if (productType === 'babyRoll') {
      currentThickness = '12';   // 유아 롤매트 기본: 12T
    } else if (productType === 'petRoll') {
      currentThickness = '9';   // 애견 롤매트 기본: 9T
    }

    // 구매 링크 업데이트
    $purchaseLink.href = product.link;

    // 두께 선택 UI 업데이트
    updateThicknessSelector();

    // 계산 방식 섹션 표시 여부 업데이트
    if ($calcModeSection) {
      if (productType === 'puzzle') {
        $calcModeSection.style.display = 'block';
      } else {
        $calcModeSection.style.display = 'none';
      }
    }

    // 배송메모 복사 버튼 표시 여부 업데이트 (애견 롤매트만 표시)
    if ($copyShippingMemo) {
      if (productType === 'petRoll') {
        $copyShippingMemo.style.display = 'block';
      } else {
        $copyShippingMemo.style.display = 'none';
      }
    }

    // 기존 공간들의 매트 타입 옵션 업데이트
    updateAllSpaceMatTypes();
  }

  // 제품 변경 시 자동 재계산
  function updateAllSpaceMatTypes() {
    // 자동 재계산
    calculate();
  }

  // 탭 버튼 클릭 이벤트
  function initProductTabs() {
    const tabButtons = document.querySelectorAll('.product-tab-btn');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        // 모든 탭에서 active 클래스 제거
        tabButtons.forEach(b => b.classList.remove('active'));

        // 클릭된 탭에 active 클래스 추가
        btn.classList.add('active');

        // 제품 정보 업데이트
        const productType = btn.dataset.product;
        updateProductDisplay(productType);
      });
    });
  }


  // 모든 공간의 이름 필드를 업데이트
  function updateSpaceNameFields() {
    const showSpaceName = spaces.length > 1;

    spaces.forEach(space => {
      const nameLabel = space.element.querySelector('.space-name-label');
      const nameInput = space.element.querySelector('.space-name');

      if (showSpaceName) {
        if (nameLabel) nameLabel.style.display = 'flex';
      } else {
        if (nameLabel) nameLabel.style.display = 'none';
        if (nameInput) nameInput.value = '';
      }
    });
  }

  // 공간 추가 함수
  function addSpace() {
    spaceCounter++;
    const id = spaceCounter;

    const spaceDiv = document.createElement('div');
    spaceDiv.className = 'space-section';
    spaceDiv.dataset.spaceId = id;

    spaceDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0;">공간 정보</h3>
        <button class="remove-space" data-space-id="${id}">삭제</button>
      </div>
      <label class="space-name-label" style="display: none;">
        <span>공간 이름</span>
        <input type="text" class="space-name" placeholder="예: 거실" value="" />
      </label>
      <div class="grid">
        <label>
          <span>가로(cm)</span>
          <input type="number" class="space-w" min="0" value="300" />
        </label>
        <label>
          <span>세로(cm)</span>
          <input type="number" class="space-h" min="0" value="200" />
        </label>
      </div>
    `;

    $spacesContainer.appendChild(spaceDiv);

    // 삭제 버튼 이벤트
    const removeBtn = spaceDiv.querySelector('.remove-space');
    removeBtn.addEventListener('click', () => removeSpace(id));

    // 입력 변경 시 자동 계산
    const inputs = spaceDiv.querySelectorAll('input, select');
    inputs.forEach(input => {
      ['input', 'change'].forEach(evt => {
        input.addEventListener(evt, calculate);
      });
    });

    // spaces 배열에 추가
    spaces.push({
      id,
      element: spaceDiv,
      getName: () => spaceDiv.querySelector('.space-name').value,
      getW: () => spaceDiv.querySelector('.space-w').value,
      getH: () => spaceDiv.querySelector('.space-h').value,
      getType: () => {
        // 현재 제품에 따라 자동으로 타입 결정
        if (currentProduct === 'puzzle') return 'hybrid';
        if (currentProduct === 'babyRoll') return 'roll';
        if (currentProduct === 'petRoll') return 'petRoll';
        return 'hybrid';
      }
    });

    // 이름 필드 표시 여부 업데이트
    updateSpaceNameFields();

    calculate();
  }

  // 공간 삭제 함수
  function removeSpace(id) {
    const index = spaces.findIndex(s => s.id === id);
    if (index !== -1) {
      spaces[index].element.remove();
      spaces.splice(index, 1);

      // 이름 필드 표시 여부 업데이트
      updateSpaceNameFields();

      calculate();
    }
  }

  function ceilDiv(a, b) { return Math.ceil(a / b); }
  function floorDiv(a, b) { return Math.floor(a / b); }

  function clampNonNegInt(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function formatLength(cm) {
    if (cm <= 0) return '0m';
    const meters = cm / 100;
    if (Number.isInteger(meters)) return `${meters}m`;
    if (Number.isInteger(meters * 10)) return `${meters.toFixed(1)}m`;
    return `${meters.toFixed(2)}m`;
  }

  function createFitMessages(actualWidth, actualHeight, coverageWidth, coverageHeight) {
    const messages = [];

    const widthDiff = coverageWidth - actualWidth;
    const heightDiff = coverageHeight - actualHeight;

    if (widthDiff > 0) {
      messages.push(`가로로 ${widthDiff}cm 재단이 필요합니다.`);
    } else if (widthDiff < 0) {
      messages.push(`가로로 ${Math.abs(widthDiff)}cm 매트가 부족합니다.`);
    }

    if (heightDiff > 0) {
      messages.push(`세로로 ${heightDiff}cm 재단이 필요합니다.`);
    } else if (heightDiff < 0) {
      messages.push(`세로로 ${Math.abs(heightDiff)}cm 매트가 부족합니다.`);
    }

    if (messages.length === 0) {
      messages.push('가로와 세로가 모두 정확히 맞습니다.');
    }

    return messages;
  }

  // 계산 모드 가져오기
  function getCalcMode() {
    const hiddenInput = document.getElementById('calc-mode-value');
    return hiddenInput ? hiddenInput.value : 'loose';
  }

  // 현재 두께 라벨 가져오기
  function getThicknessLabel() {
    if (currentThickness === '25plus') return '25T Plus+';
    return currentThickness + 'T';
  }

  // 현재 선택된 두께의 가격 가져오기
  function getCurrentPrice() {
    if (currentProduct === 'puzzle') {
      return PUZZLE_PRICES[currentThickness] || PUZZLE_PRICES[25];
    }
    return null; // 롤매트는 별도 처리
  }

  // 롤매트 두께별 사용 가능한 폭 목록
  function getAvailableRollWidths() {
    const thickness = parseInt(currentThickness);
    return Object.keys(ROLL_PRICES[thickness] || {}).map(Number);
  }

  // 50cm 매트만 사용하는 계산 (4장 = 1세트)
  function calculate50(width, height, mode) {
    const tile = 50;
    let nx, ny;

    if (mode === 'exact') {
      // 정확히 맞추기: 올림
      nx = ceilDiv(width, tile);
      ny = ceilDiv(height, tile);
    } else {
      // 여유있게 깔기: 내림 (공간보다 작게)
      nx = floorDiv(width, tile);
      ny = floorDiv(height, tile);
    }

    const totalTiles = nx * ny;  // 전체 50cm 타일 개수
    const sets = ceilDiv(totalTiles, 4);  // 4장 단위로 세트 계산
    const pricePerSet = getCurrentPrice();
    const price = sets * pricePerSet;
    const area = width * height;
    const usedArea = nx * tile * ny * tile;
    const wastePercent = area > 0 ? Math.round(((usedArea - area) / usedArea) * 100) : 0;
    const coverageWidth = nx * tile;
    const coverageHeight = ny * tile;

    return {
      type: `50cm 매트 (4pcs 세트) - ${getThicknessLabel()}`,
      nx,
      ny,
      totalTiles,
      sets,
      pcs: sets,  // 세트 수를 장수로 표시
      price,
      wastePercent,
      breakdown: [`50cm 매트: ${sets}세트 (${totalTiles}개 타일)`],
      coverageWidth,
      coverageHeight,
      fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight)
    };
  }

  // 100cm 매트만 사용하는 계산
  function calculate100(width, height, mode) {
    const tile = 100;
    let nx, ny;

    if (mode === 'exact') {
      // 정확히 맞추기: 올림
      nx = ceilDiv(width, tile);
      ny = ceilDiv(height, tile);
    } else {
      // 여유있게 깔기: 내림 (공간보다 작게)
      nx = floorDiv(width, tile);
      ny = floorDiv(height, tile);
    }

    const pcs = nx * ny;
    const pricePerPcs = getCurrentPrice();
    const price = pcs * pricePerPcs;
    const area = width * height;
    const usedArea = nx * tile * ny * tile;
    const wastePercent = area > 0 ? Math.round(((usedArea - area) / usedArea) * 100) : 0;
    const coverageWidth = nx * tile;
    const coverageHeight = ny * tile;

    return {
      type: `100cm 매트 (1pcs) - ${getThicknessLabel()}`,
      nx,
      ny,
      pcs,
      price,
      wastePercent,
      breakdown: [`100cm 매트: ${pcs}장`],
      coverageWidth,
      coverageHeight,
      fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight)
    };
  }

  // 롤매트 계산 함수
  function calculateRollMat(width, height, mode, { isPet = false } = {}) {
    // 1. 어느 면을 길이로 할지 결정
    const width50 = width % 50 === 0;
    const height50 = height % 50 === 0;

    let targetWidth, targetLength;
    let widthAxis = 'width';

    if (width50 && !height50) {
      targetLength = width;
      targetWidth = height;
      widthAxis = 'height';
    } else if (!width50 && height50) {
      targetLength = height;
      targetWidth = width;
      widthAxis = 'width';
    } else if (width <= height) {
      targetWidth = width;
      targetLength = height;
      widthAxis = 'width';
    } else {
      targetWidth = height;
      targetLength = width;
      widthAxis = 'height';
    }

    // 2. 가능한 폭 조합 수집
    const thickness = parseInt(currentThickness);
    const looseCombos = generateRollWidthCombinations(targetWidth, 'loose');
    const exactCombos = generateRollWidthCombinations(targetWidth, 'exact');
    const extendedExactCombos = generateRollWidthCombinations(
      targetWidth,
      'exact',
      { exactOverageCap: EXTENDED_EXACT_OVERAGE_CAP_CM }
    );

    const combinationMap = new Map();
    function addCombinationList(list, source) {
      if (!list) return;
      list.forEach(combo => {
        const key = combo.solutions
          .map(sol => `${sol.width}x${sol.count}`)
          .sort()
          .join('|');
        if (!combinationMap.has(key)) {
          combinationMap.set(key, { ...combo, source });
        }
      });
    }

    addCombinationList(looseCombos, 'loose');
    addCombinationList(exactCombos, 'exact');
    addCombinationList(extendedExactCombos, 'exactExtended');

    const combinationCandidates = Array.from(combinationMap.values());
    if (combinationCandidates.length === 0) {
      return null;
    }

    const preferredRule = (PREFERRED_WIDTH_RULES || []).find(rule => targetWidth >= rule.min && targetWidth <= rule.max);
    if (preferredRule) {
      combinationCandidates.forEach(candidate => {
        if (candidate.solutions.length !== 1) return;
        const only = candidate.solutions[0];
        const matched = preferredRule.prefer?.some(pref => pref.width === only.width && pref.count === only.count && pref.mode === candidate.mode);
        if (matched) {
          candidate.preferred = true;
        }
      });
    }

    // 3. 길이 계산 (50cm 단위, 최대 길이 제한 적용)
    const maxLength = ROLL_MAX_LENGTH[thickness] || Infinity;
    let calculatedLength;
    const lengthCeil = ceilDiv(targetLength, 50) * 50;
    const lengthFloor = Math.floor(targetLength / 50) * 50;
    calculatedLength = lengthCeil;

    const floorShortage = targetLength - lengthFloor;
    if (lengthFloor > 0 && floorShortage > 0 && floorShortage <= LENGTH_RELAXATION_THRESHOLD_CM) {
      calculatedLength = lengthFloor;
    }

    if (calculatedLength <= 0) {
      calculatedLength = 50;
    }

    let rollLength;
    let splitCount;
    if (calculatedLength <= maxLength) {
      rollLength = calculatedLength;
      splitCount = 1;
    } else {
      const fullRolls = Math.ceil(calculatedLength / maxLength);
      rollLength = Math.ceil(calculatedLength / fullRolls / 50) * 50;
      splitCount = fullRolls;
    }

    // 4. 조합 평가 및 가격 계산
    const lengthIn50cm = rollLength / 50;
    const evaluatedCombos = combinationCandidates.map(combo => {
      const usedWidth = combo.solutions.reduce((sum, sol) => sum + (sol.width * sol.count), 0);
      const widthDiff = usedWidth - targetWidth;
      const wasteAbsCm = Math.abs(widthDiff);

      let comboPrice = 0;
      let valid = true;
      combo.solutions.forEach(sol => {
        const pricePerUnit = ROLL_PRICES[thickness][sol.width];
        if (pricePerUnit == null) {
          valid = false;
          return;
        }
        comboPrice += pricePerUnit * lengthIn50cm * sol.count * splitCount;
      });
      if (!valid) return null;

      const baseRollCount = combo.solutions.reduce((sum, sol) => sum + sol.count, 0);
      const rollCountWithSplit = baseRollCount * splitCount;

      return {
        ...combo,
        price: comboPrice,
        usedWidth,
        widthDiff,
        wasteAbsCm,
        rollCountWithSplit,
        preferred: combo.preferred === true
      };
    }).filter(Boolean);

    if (evaluatedCombos.length === 0) {
      return null;
    }

    evaluatedCombos.sort((a, b) => {
      if (Math.abs(a.wasteAbsCm - b.wasteAbsCm) > 0.0001) {
        return a.wasteAbsCm - b.wasteAbsCm;
      }
      if (Math.abs(a.price - b.price) > 0.0001) {
        return a.price - b.price;
      }
      const aCovers = a.widthDiff >= 0 ? 1 : 0;
      const bCovers = b.widthDiff >= 0 ? 1 : 0;
      if (aCovers !== bCovers) {
        return bCovers - aCovers;
      }
      if (a.preferred !== b.preferred) {
        return a.preferred ? -1 : 1;
      }
      if (a.sameWidth !== b.sameWidth) {
        return b.sameWidth - a.sameWidth;
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.rollCountWithSplit - b.rollCountWithSplit;
    });

    const bestCombo = evaluatedCombos[0];
    const solutions = bestCombo.solutions;
    const totalPrice = bestCombo.price;
    const breakdown = [];

    solutions.forEach(sol => {
      const countText = splitCount > 1 ? `${sol.count}개 × ${splitCount}롤` : `${sol.count}개`;
      if (isPet) {
        const units = lengthIn50cm * sol.count * splitCount;
        breakdown.push(`${getThicknessLabel()} - ${sol.width}cm 폭 × ${rollLength}cm 길이 × ${countText} (50cm ${units}개 구매)`);
      } else {
        breakdown.push(`${getThicknessLabel()} - ${sol.width}cm 폭 × ${rollLength}cm 길이 × ${countText}`);
      }
    });

    // 5. 낭비율 및 커버리지 계산
    const actualArea = width * height;
    const usedWidth = bestCombo.usedWidth;
    const totalUsedLength = rollLength * splitCount;
    const usedArea = usedWidth * totalUsedLength;
    const wastePercent = actualArea > 0 ? Math.round(((usedArea - actualArea) / usedArea) * 100) : 0;
    const coverageWidth = widthAxis === 'width' ? usedWidth : totalUsedLength;
    const coverageHeight = widthAxis === 'width' ? totalUsedLength : usedWidth;
    const totalRolls = bestCombo.rollCountWithSplit;
    const totalRollUnits = lengthIn50cm * totalRolls;

    let shippingMemo = '';
    if (isPet && solutions.length > 0) {
      const cutRequestList = solutions.map(sol => {
        const meters = formatLength(rollLength);
        const totalRollsPerWidth = sol.count * splitCount;
        const rollText = splitCount > 1 ? `${totalRollsPerWidth}롤` : `${sol.count}롤`;
        return `${sol.width}cm 폭 ${meters} ${rollText}`;
      });
      shippingMemo = `배송메모(재단요청): ${cutRequestList.join(', ')}으로 재단`;
      breakdown.push(shippingMemo);
    }

    const rollLabel = isPet ? '애견 롤매트' : '유아 롤매트';

    const complementLines = [];

    return {
      type: `${rollLabel} - ${getThicknessLabel()}`,
      targetWidth,
      targetLength,
      calculatedLength,
      rollLength,
      splitCount,
      solutions,
      totalPrice,
      price: totalPrice,
      wastePercent,
      breakdown: (complementLines.length > 0)
        ? [...breakdown, ...complementLines]
        : breakdown,
      coverageWidth,
      coverageHeight,
      fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight),
      pcs: totalRolls,
      rollCount: totalRolls,
      totalRollUnits,
      shippingMemo,
      widthAxis
    };
  }

  // 최적의 롤매트 폭 조합 찾기
  function generateRollWidthCombinations(targetWidth, mode, { exactOverageCap = EXACT_OVERAGE_CAP_CM } = {}) {
    const thickness = parseInt(currentThickness);
    const availableWidths = getAvailableRollWidths();
    const combinations = [];

    // 1. 모든 가능한 단일 폭 조합
    for (let width of availableWidths) {
      for (let count = 1; count <= 10; count++) {
        const totalWidth = width * count;

        if (mode === 'exact') {
          if (totalWidth >= targetWidth && totalWidth <= targetWidth + exactOverageCap) {
            const waste = totalWidth - targetWidth;
            const wastePercent = (waste / totalWidth) * 100;

            combinations.push({
              mode,
              solutions: [{ width, count }],
              totalWidth,
              waste,
              wastePercent,
              rollCount: count,
              priority: getRollWidthPriority(width, thickness),
              sameWidth: true
            });

            break; // 더 많은 개수는 불필요
          }
        } else {
          if (totalWidth <= targetWidth) {
            const shortage = targetWidth - totalWidth;
            const shortagePercent = (shortage / targetWidth) * 100;

            combinations.push({
              mode,
              solutions: [{ width, count }],
              totalWidth,
              waste: -shortage,
              wastePercent: -shortagePercent,
              rollCount: count,
              priority: getRollWidthPriority(width, thickness),
              sameWidth: true
            });
          } else {
            break;
          }
        }
      }
    }

    // 2. 2개 폭 조합 (가능한 모든 폭 쌍)
    const pairs = [];
    for (let i = 0; i < availableWidths.length; i++) {
      for (let j = i + 1; j < availableWidths.length; j++) {
        pairs.push([availableWidths[i], availableWidths[j]]);
      }
    }

    for (let [w1, w2] of pairs) {
      for (let count1 = 1; count1 <= 5; count1++) {
        for (let count2 = 1; count2 <= 5; count2++) {
          const totalWidth = (w1 * count1) + (w2 * count2);

          if (mode === 'exact') {
            if (totalWidth >= targetWidth && totalWidth <= targetWidth + exactOverageCap) {
              const waste = totalWidth - targetWidth;
              const wastePercent = (waste / totalWidth) * 100;
              const avgPriority = (getRollWidthPriority(w1, thickness) + getRollWidthPriority(w2, thickness)) / 2;

              combinations.push({
                mode,
                solutions: [
                  { width: w1, count: count1 },
                  { width: w2, count: count2 }
                ],
                totalWidth,
                waste,
                wastePercent,
                rollCount: count1 + count2,
                priority: avgPriority,
                sameWidth: false
              });
            }
          } else {
            if (totalWidth <= targetWidth) {
              const shortage = targetWidth - totalWidth;
              const shortagePercent = (shortage / targetWidth) * 100;
              const avgPriority = (getRollWidthPriority(w1, thickness) + getRollWidthPriority(w2, thickness)) / 2;

              combinations.push({
                mode,
                solutions: [
                  { width: w1, count: count1 },
                  { width: w2, count: count2 }
                ],
                totalWidth,
                waste: -shortage,
                wastePercent: -shortagePercent,
                rollCount: count1 + count2,
                priority: avgPriority,
                sameWidth: false
              });
            }
          }
        }
      }
    }

    combinations.sort((a, b) => {
      const wasteA = Math.abs(a.wastePercent ?? 0);
      const wasteB = Math.abs(b.wastePercent ?? 0);

      if (Math.abs(wasteA - wasteB) > 5) {
        return wasteA - wasteB;
      }

      if (a.sameWidth !== b.sameWidth) {
        return b.sameWidth - a.sameWidth;
      }

      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return (a.rollCount || 0) - (b.rollCount || 0);
    });

    return combinations;
  }

  // 복합 매트 최적화 계산 (100cm 우선, 나머지 50cm 4장 세트)
  function calculateHybrid(width, height, mode) {
    // 100cm로 채울 수 있는 최대 개수
    const n100x = Math.floor(width / 100);
    const n100y = Math.floor(height / 100);

    // 나머지 공간
    const remainX = width - (n100x * 100);
    const remainY = height - (n100y * 100);

    let total100 = 0;
    let total50Tiles = 0;  // 50cm 타일 개수
    let breakdown = [];

    // 1. 메인 영역 (100cm로 채우기)
    if (n100x > 0 && n100y > 0) {
      total100 = n100x * n100y;
    }

    // 나머지 영역 계산 로직 선택
    const divFunc = mode === 'exact' ? ceilDiv : floorDiv;

    // 2. 오른쪽 세로 띠 (remainX × (n100y * 100))
    if (remainX > 0 && n100y > 0) {
      const stripHeight = n100y * 100;
      const stripTiles = divFunc(remainX, 50) * divFunc(stripHeight, 50);
      total50Tiles += stripTiles;
    }

    // 3. 아래쪽 가로 띠 (n100x * 100 × remainY)
    if (n100x > 0 && remainY > 0) {
      const stripWidth = n100x * 100;
      const stripTiles = divFunc(stripWidth, 50) * divFunc(remainY, 50);
      total50Tiles += stripTiles;
    }

    // 4. 오른쪽 아래 모서리 (remainX × remainY)
    if (remainX > 0 && remainY > 0) {
      const cornerTiles = divFunc(remainX, 50) * divFunc(remainY, 50);
      total50Tiles += cornerTiles;
    }

    // 50cm 타일을 4장 단위 세트로 변환
    const total50Sets = ceilDiv(total50Tiles, 4);

    // 가격 계산 (현재 선택된 두께 기준)
    const pricePerPcs = getCurrentPrice();
    const price = (total100 * pricePerPcs) + (total50Sets * pricePerPcs);

    // 낭비율 계산
    const area = width * height;
    const usedArea100 = total100 * 100 * 100;
    const usedArea50 = total50Tiles * 50 * 50;
    const totalUsedArea = usedArea100 + usedArea50;
    const wastePercent = area > 0 ? Math.round(((totalUsedArea - area) / totalUsedArea) * 100) : 0;
    const divFuncCoverage = mode === 'exact' ? ceilDiv : floorDiv;
    const coverageWidth = (n100x * 100) + (remainX > 0 ? divFuncCoverage(remainX, 50) * 50 : 0);
    const coverageHeight = (n100y * 100) + (remainY > 0 ? divFuncCoverage(remainY, 50) * 50 : 0);

    // 상세 내역
    if (total100 > 0) breakdown.push(`${getThicknessLabel()} 100×100cm 1pcs: ${total100}장`);
    if (total50Sets > 0) {
      if (total50Tiles === total50Sets * 4) {
        // 모든 조각을 사용하는 경우
        breakdown.push(`${getThicknessLabel()} 50×50cm 4pcs: ${total50Sets}장`);
      } else {
        // 일부 조각만 사용하는 경우
        breakdown.push(`${getThicknessLabel()} 50×50cm 4pcs: ${total50Sets}장 (${total50Tiles}조각 사용)`);
      }
    }

    return {
      type: `복합 매트 (최적화) - ${getThicknessLabel()}`,
      n100x,
      n100y,
      total100,
      total50: total50Sets,  // 세트 수
      total50Tiles,  // 실제 타일 개수
      totalPcs: total100 + total50Sets,
      price,
      wastePercent,
      breakdown,
      coverageWidth,
      coverageHeight,
      fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight)
    };
  }

  function calculateSpace(name, width, height, type, mode) {
    const W = clampNonNegInt(width);
    const H = clampNonNegInt(height);

    if (W === 0 || H === 0) {
      return null; // 빈 공간
    }

    let result;
    if (type === '50') {
      result = calculate50(W, H, mode);
    } else if (type === '100') {
      result = calculate100(W, H, mode);
    } else if (type === 'roll') {
      result = calculateRollMat(W, H, mode, { isPet: false });
    } else if (type === 'petRoll') {
      result = calculateRollMat(W, H, mode, { isPet: true });
    } else { // hybrid
      result = calculateHybrid(W, H, mode);
    }

    const visualization = createVisualizationData(type, W, H, result);

    return {
      name: name,
      width: W,
      height: H,
      mode: mode === 'exact' ? '정확히 맞추기' : '여유있게 깔기',
      modeKey: mode,
      spaceType: type,
      visualization,
      ...result
    };
  }

  function calculate() {
    // 복사 버튼 상태 초기화
    resetCopyButton();

    const calcMode = getCalcMode();
    const spaceResults = [];
    let totalPrice = 0;
    let activeSpaces = 0;
    let total50 = 0;
    let total100 = 0;
    let spacesNeedingTrim = 0;
    let spacesWithGap = 0;
    let totalRolls = 0;
    let totalRollUnits = 0;
    const shippingMemos = [];

    // 각 공간 계산
    spaces.forEach((space) => {
      const result = calculateSpace(
        space.getName(),
        space.getW(),
        space.getH(),
        space.getType(),
        calcMode
      );
      if (result) {
        spaceResults.push({ index: space.id, ...result });
        totalPrice += result.price;
        activeSpaces++;

        // 타입별 집계
        if (result.total50) total50 += result.total50;
        if (result.total100) total100 += result.total100;
        if (result.pcs && space.getType() === '50') total50 += result.pcs;
        if (result.pcs && space.getType() === '100') total100 += result.pcs;

        // 재단/여유 안내 통계
        if (result.fitMessages && result.fitMessages.length > 0) {
          const hasTrim = result.fitMessages.some(msg => msg.includes('재단이 필요'));
          const hasGap = result.fitMessages.some(msg => msg.includes('매트가 부족합니다'));
          if (hasTrim) spacesNeedingTrim += 1;
          if (hasGap) spacesWithGap += 1;
        }

        if (result.rollCount) totalRolls += result.rollCount;
        if (result.totalRollUnits) totalRollUnits += result.totalRollUnits;
        if (result.shippingMemo && result.shippingMemo !== '배송메모 : 없음') {
          shippingMemos.push(result.shippingMemo);
        }
      }
    });

    let fitSummary = '';
    if (activeSpaces > 0) {
      const parts = [];
      if (spacesNeedingTrim > 0) {
        parts.push(`재단 필요: ${spacesNeedingTrim}곳`);
      }
      if (spacesWithGap > 0) {
        parts.push(`여유 공간: ${spacesWithGap}곳`);
      }
      fitSummary = parts.length > 0 ? parts.join(', ') : '모든 공간이 정확히 맞습니다.';
    }

    // 결과 저장
    lastCalculationResults = {
      spaceResults,
      activeSpaces,
      total50,
      total100,
      totalPrice,
      fitSummary,
      totalRolls,
      totalRollUnits,
      shippingMemos
    };

    // 총 구성 표시
    let totalCompositionHTML = '';
    if (activeSpaces > 0) {
      spaceResults.forEach((r, idx) => {
        const spaceName = r.name || `공간 ${idx + 1}`;
        totalCompositionHTML += `<div style="margin-bottom: 12px;">
          <strong>${spaceName}</strong>
          <span class="muted small">(${r.width}cm × ${r.height}cm)</span>
        </div>`;
        if (r.breakdown && r.breakdown.length > 0) {
          r.breakdown.forEach((line, lineIdx) => {
            // 배송메모는 구분선으로 분리
            if (line.includes('배송메모')) {
              totalCompositionHTML += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;"></div>`;
              totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 8px; font-weight: 500;">${line}</div>`;
            } else {
              totalCompositionHTML += `<div style="margin-left: 15px; margin-bottom: ${lineIdx < r.breakdown.length - 1 ? '6px' : '0'};}">${line}</div>`;
            }
          });
        }
        if (Number.isFinite(r.coverageWidth) && Number.isFinite(r.coverageHeight)) {
          totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 10px; color: #64748b; font-size: 12px;">매트의 크기는 총 ${r.coverageWidth}cm × ${r.coverageHeight}cm 입니다.</div>`;
        }
        // 재단/여유 안내 메시지 표시 (작은 글씨)
        if (r.fitMessages && r.fitMessages.length > 0) {
          totalCompositionHTML += `<div style="margin-top: 6px;"></div>`;
          r.fitMessages.forEach(msg => {
            totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 4px; color: #64748b; font-size: 12px;">${msg}</div>`;
          });
        }
        totalCompositionHTML += `
          <div class="space-visual-wrapper">
            <div class="space-visual" data-space-visual-id="${r.index}"></div>
          </div>`;
        if (idx < spaceResults.length - 1) {
          totalCompositionHTML += `<div style="margin: 18px 0; border-top: 2px solid #e2e8f0;"></div>`;
        }
      });
      if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
        totalCompositionHTML += `<div style="margin-top: 12px; color: #94a3b8; font-size: 12px;">제품 출고 시 온도차에 의한 수축과 재단 과정의 오차를 고려해 여분을 두고 출고합니다.</div>`;
      }
    } else {
      totalCompositionHTML = '-';
    }
    $totalComposition.innerHTML = totalCompositionHTML;

    renderSpaceVisualizations(spaceResults);

    let totalPcsText = '-';
    if (activeSpaces > 0) {
      if (currentProduct === 'puzzle') {
        const parts = [];
        if (total100 > 0) parts.push(`100×100cm 1pcs: ${total100}장`);
        if (total50 > 0) parts.push(`50×50cm 4pcs: ${total50}장`);
        totalPcsText = parts.join(' / ');
      } else if (currentProduct === 'babyRoll') {
        totalPcsText = totalRolls > 0 ? `${totalRolls}롤` : '0롤';
      } else if (currentProduct === 'petRoll') {
        totalPcsText = totalRolls > 0 ?
          `${totalRolls}롤 (50cm ${totalRollUnits}개)` :
          '0롤';
      }
    }
    $totalPcs.textContent = totalPcsText;
    $totalPrice.textContent = activeSpaces > 0 ? KRW.format(totalPrice) : '-';
  }


  // 견적서 텍스트 생성 함수
  function generateEstimateText() {
    if (!lastCalculationResults || lastCalculationResults.activeSpaces === 0) {
      return '견적 결과가 없습니다. 먼저 계산을 실행해주세요.';
    }

    const {
      spaceResults,
      total50,
      total100,
      totalPrice,
      totalRolls,
      totalRollUnits
    } = lastCalculationResults;

    const calcMode = getCalcMode();
    const calcModeText = calcMode === 'exact' ? '정확히 맞추기' : '여유있게 깔기';
    const productInfo = PRODUCTS[currentProduct];

    let text = '견적 결과\n\n';

    text += '견적내용\n';
    spaceResults.forEach((r, idx) => {
      const spaceName = r.name || `공간 ${idx + 1}`;
      text += `\n${spaceName} (${r.width}cm × ${r.height}cm)\n`;
      if (r.breakdown && r.breakdown.length > 0) {
        r.breakdown.forEach((line, lineIdx) => {
          // 배송메모는 구분선으로 분리
          if (line.includes('배송메모')) {
            text += '\n';
            text += `${line}\n`;
          } else {
            text += `  ${line}\n`;
          }
        });
      }
      if (Number.isFinite(r.coverageWidth) && Number.isFinite(r.coverageHeight)) {
        text += `  매트의 크기는 총 ${r.coverageWidth}cm × ${r.coverageHeight}cm 입니다.\n`;
      }
      // 재단/여유 안내 메시지
      if (r.fitMessages && r.fitMessages.length > 0) {
        r.fitMessages.forEach(msg => {
          text += `  ${msg}\n`;
        });
      }
      // 공간 간 구분
      if (idx < spaceResults.length - 1) {
        text += '\n────────────────────\n';
      }
    });

    text += '\n[ 총 장수 ]\n';
    if (currentProduct === 'puzzle') {
      const parts = [];
      if (total100 > 0) parts.push(`100×100cm 1pcs: ${total100}장`);
      if (total50 > 0) parts.push(`50×50cm 4pcs: ${total50}장`);
      text += `${parts.join(' / ')}\n`;
    } else if (currentProduct === 'babyRoll') {
      text += `${totalRolls}롤\n`;
    } else if (currentProduct === 'petRoll') {
      text += `${totalRolls}롤 (50cm ${totalRollUnits}개)\n`;
    }

    text += '\n[ 총 가격 ]\n';
    text += `${KRW.format(totalPrice)} (할인 미적용가)`;

    return text;
  }

  function renderSpaceVisualizations(spaceResults) {
    if (!spaceResults || spaceResults.length === 0) return;

    spaceResults.forEach(result => {
      const container = document.querySelector(`[data-space-visual-id="${result.index}"]`);
      if (!container) return;

      const vis = result.visualization;
      if (!vis) {
        container.style.display = 'none';
        return;
      }

      const spaceWidth = Math.max(vis.space.width, 1);
      const spaceHeight = Math.max(vis.space.height, 1);
      const coverageWidth = Math.max(vis.coverage.width, 1);
      const coverageHeight = Math.max(vis.coverage.height, 1);
      const baseWidth = Math.max(spaceWidth, coverageWidth);
      const baseHeight = Math.max(spaceHeight, coverageHeight);

      // 여백 추가 (좌우상하 각 15% 여백)
      const padding = Math.max(baseWidth, baseHeight) * 0.15;
      const viewBoxWidth = baseWidth + padding * 2;
      const viewBoxHeight = baseHeight + padding * 2;

      container.innerHTML = '';
      container.style.display = 'block';
      container.dataset.deferRender = '';

      const rect = container.getBoundingClientRect();
      const containerSize = rect.width || rect.height || container.clientWidth;
      if (!containerSize) {
        if (!container.dataset.deferScheduled) {
          container.dataset.deferScheduled = '1';
          requestAnimationFrame(() => renderSpaceVisualizations(spaceResults));
        }
        return;
      }

      delete container.dataset.deferScheduled;

      const scale = containerSize / Math.max(viewBoxWidth, viewBoxHeight);
      const gridMinor = vis.gridMinor || 10;
      const gridMajor = vis.gridMajor || gridMinor * 5;
      container.style.setProperty('--grid-size-small', `${gridMinor * scale}px`);
      container.style.setProperty('--grid-size-large', `${gridMajor * scale}px`);

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `${-padding} ${-padding} ${viewBoxWidth} ${viewBoxHeight}`);
      svg.setAttribute('class', 'space-visual-svg');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // 격자선 그리기 (매트 영역 기준)
      const gridGroup = document.createElementNS(SVG_NS, 'g');
      gridGroup.setAttribute('opacity', '0.3');

      // 세로 격자선 (Minor grid - 10cm)
      for (let x = 0; x <= baseWidth; x += gridMinor) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', baseHeight);
        line.setAttribute('stroke', '#94a3b8');
        line.setAttribute('stroke-width', x % gridMajor === 0 ? 0.8 : 0.3);
        gridGroup.appendChild(line);
      }

      // 가로 격자선 (Minor grid - 10cm)
      for (let y = 0; y <= baseHeight; y += gridMinor) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', baseWidth);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#94a3b8');
        line.setAttribute('stroke-width', y % gridMajor === 0 ? 0.8 : 0.3);
        gridGroup.appendChild(line);
      }

      svg.appendChild(gridGroup);

      const spaceRect = document.createElementNS(SVG_NS, 'rect');
      spaceRect.setAttribute('x', 0);
      spaceRect.setAttribute('y', 0);
      spaceRect.setAttribute('width', spaceWidth);
      spaceRect.setAttribute('height', spaceHeight);
      spaceRect.setAttribute('fill', 'rgba(226, 232, 240, 0.35)');
      spaceRect.setAttribute('stroke', '#94a3b8');
      spaceRect.setAttribute('stroke-dasharray', '6 4');
      svg.appendChild(spaceRect);

      const coverageRect = document.createElementNS(SVG_NS, 'rect');
      coverageRect.setAttribute('x', 0);
      coverageRect.setAttribute('y', 0);
      coverageRect.setAttribute('width', coverageWidth);
      coverageRect.setAttribute('height', coverageHeight);
      coverageRect.setAttribute('fill', 'rgba(37, 99, 235, 0.14)');
      coverageRect.setAttribute('stroke', '#2563eb');
      coverageRect.setAttribute('stroke-width', 1.2);
      svg.appendChild(coverageRect);

      if (vis.type === 'puzzle' && Array.isArray(vis.tiles)) {
        vis.tiles.forEach((tile, idx) => {
          const tileRect = document.createElementNS(SVG_NS, 'rect');
          tileRect.setAttribute('x', tile.x);
          tileRect.setAttribute('y', tile.y);
          tileRect.setAttribute('width', tile.width);
          tileRect.setAttribute('height', tile.height);

          // 100cm 타일과 50cm 타일을 다른 색상으로 표시
          if (tile.size === 100) {
            tileRect.setAttribute('fill', 'rgba(37, 99, 235, 0.6)');
            tileRect.setAttribute('stroke', '#1e40af');
            tileRect.setAttribute('stroke-width', 1.2);
          } else {
            tileRect.setAttribute('fill', idx % 2 === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(96, 165, 250, 0.55)');
            tileRect.setAttribute('stroke', '#1d4ed8');
            tileRect.setAttribute('stroke-width', 0.6);
          }

          svg.appendChild(tileRect);

          // 타일 중앙에 사이즈 표기 (충분히 큰 타일에만)
          if (tile.width >= 30 && tile.height >= 30) {
            const centerX = tile.x + tile.width / 2;
            const centerY = tile.y + tile.height / 2;
            const tileLabel = document.createElementNS(SVG_NS, 'text');
            tileLabel.setAttribute('x', centerX);
            tileLabel.setAttribute('y', centerY);
            tileLabel.setAttribute('font-size', Math.min(tile.width, tile.height) * 0.1);
            tileLabel.setAttribute('fill', '#ffffff');
            tileLabel.setAttribute('font-weight', '500');
            tileLabel.setAttribute('text-anchor', 'middle');
            tileLabel.setAttribute('dominant-baseline', 'middle');
            tileLabel.textContent = `${tile.width}×${tile.height}cm`;
            svg.appendChild(tileLabel);
          }
        });
      } else if (vis.type === 'roll' && Array.isArray(vis.stripes)) {
        const colors = ['rgba(59, 130, 246, 0.55)', 'rgba(37, 99, 235, 0.55)', 'rgba(96, 165, 250, 0.55)'];
        vis.stripes.forEach((strip, idx) => {
          const stripRect = document.createElementNS(SVG_NS, 'rect');
          stripRect.setAttribute('x', strip.x);
          stripRect.setAttribute('y', strip.y);
          stripRect.setAttribute('width', strip.width);
          stripRect.setAttribute('height', strip.height);
          stripRect.setAttribute('fill', colors[idx % colors.length]);
          stripRect.setAttribute('stroke', '#1d4ed8');
          stripRect.setAttribute('stroke-width', 0.8);
          svg.appendChild(stripRect);

          // 스트라이프 중앙에 사이즈 표기 (충분히 큰 영역에만)
          const minDimension = Math.min(strip.width, strip.height);
          if (minDimension >= 20) {
            const centerX = strip.x + strip.width / 2;
            const centerY = strip.y + strip.height / 2;
            const stripLabel = document.createElementNS(SVG_NS, 'text');
            stripLabel.setAttribute('x', centerX);
            stripLabel.setAttribute('y', centerY);
            stripLabel.setAttribute('font-size', minDimension * 0.1);
            stripLabel.setAttribute('fill', '#ffffff');
            stripLabel.setAttribute('font-weight', '500');
            stripLabel.setAttribute('text-anchor', 'middle');
            stripLabel.setAttribute('dominant-baseline', 'middle');
            stripLabel.textContent = `${strip.width}×${strip.height}cm`;
            svg.appendChild(stripLabel);
          }
        });
      }

      // 격자 수치 레이블 추가 (왼쪽과 상단)
      const maxDimension = Math.max(baseWidth, baseHeight);
      const fontSize = Math.max(3, maxDimension * 0.015); // 동적 폰트 크기
      const labelOffset = fontSize * 0.3; // 레이블 간격

      // 상단 가로 레이블 (50cm 간격)
      for (let x = 0; x <= baseWidth; x += gridMajor) {
        if (x === 0) continue; // 0cm은 왼쪽 세로 레이블에서만 표시
        const labelText = document.createElementNS(SVG_NS, 'text');
        labelText.setAttribute('x', x);
        labelText.setAttribute('y', -labelOffset);
        labelText.setAttribute('font-size', fontSize);
        labelText.setAttribute('fill', '#64748b');
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('dominant-baseline', 'bottom');
        labelText.textContent = `${x}cm`;
        svg.appendChild(labelText);
      }

      // 왼쪽 세로 레이블 (50cm 간격)
      for (let y = 0; y <= baseHeight; y += gridMajor) {
        const labelText = document.createElementNS(SVG_NS, 'text');
        labelText.setAttribute('x', -labelOffset);
        labelText.setAttribute('y', y);
        labelText.setAttribute('font-size', fontSize);
        labelText.setAttribute('fill', '#64748b');
        labelText.setAttribute('text-anchor', 'end');
        labelText.setAttribute('dominant-baseline', 'middle');
        labelText.textContent = `${y}cm`;
        svg.appendChild(labelText);
      }

      container.appendChild(svg);

      // 공간명 레이블 (좌측 상단 - 절대 위치)
      const spaceName = result.name || `공간 ${result.index}`;
      const spaceNameDiv = document.createElement('div');
      spaceNameDiv.className = 'space-visual-name';
      spaceNameDiv.textContent = spaceName;
      container.appendChild(spaceNameDiv);

      // 확대 버튼 (우측 상단 - 절대 위치)
      const expandBtn = document.createElement('button');
      expandBtn.className = 'expand-canvas-btn';
      expandBtn.title = '확대하기';
      expandBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      `;
      expandBtn.addEventListener('click', () => {
        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'visualization-modal';
        modal.innerHTML = `
          <div class="visualization-modal-backdrop"></div>
          <div class="visualization-modal-content">
            <button class="visualization-modal-close" title="닫기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="visualization-modal-canvas"></div>
          </div>
        `;
        document.body.appendChild(modal);

        // 닫기 기능
        const closeModal = () => {
          modal.classList.add('closing');
          setTimeout(() => {
            document.body.removeChild(modal);
          }, 200);
        };

        modal.querySelector('.visualization-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.visualization-modal-backdrop').addEventListener('click', closeModal);

        // ESC 키로 닫기
        const handleEsc = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
          }
        };
        document.addEventListener('keydown', handleEsc);

        // 모달에 시각화 렌더링
        setTimeout(() => {
          renderSpaceVisualizationInModal(result, modal.querySelector('.visualization-modal-canvas'));
        }, 50);
      });
      container.appendChild(expandBtn);

      const info = document.createElement('div');
      info.className = 'space-visual-info';
      info.innerHTML = `
        <div class="space-visual-dim space">공간 ${spaceWidth}cm × ${spaceHeight}cm</div>
        <div class="space-visual-dim coverage">매트 ${coverageWidth}cm × ${coverageHeight}cm</div>
      `;
      container.appendChild(info);
    });
  }

  function renderSpaceVisualizationInModal(result, container) {
    if (!container || !result) return;

    const vis = result.visualization;
    if (!vis) return;

    const spaceWidth = Math.max(vis.space.width, 1);
    const spaceHeight = Math.max(vis.space.height, 1);
    const coverageWidth = Math.max(vis.coverage.width, 1);
    const coverageHeight = Math.max(vis.coverage.height, 1);
    const baseWidth = Math.max(spaceWidth, coverageWidth);
    const baseHeight = Math.max(spaceHeight, coverageHeight);

    // 여백 추가 (좌우상하 각 20% 여백)
    const padding = Math.max(baseWidth, baseHeight) * 0.2;
    const viewBoxWidth = baseWidth + padding * 2;
    const viewBoxHeight = baseHeight + padding * 2;

    const gridMinor = vis.gridMinor || 10;
    const gridMajor = vis.gridMajor || gridMinor * 5;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `${-padding} ${-padding} ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('class', 'space-visual-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // 격자선 그리기
    const gridGroup = document.createElementNS(SVG_NS, 'g');
    gridGroup.setAttribute('opacity', '0.3');

    for (let x = 0; x <= baseWidth; x += gridMinor) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', baseHeight);
      line.setAttribute('stroke', '#94a3b8');
      line.setAttribute('stroke-width', x % gridMajor === 0 ? 0.8 : 0.3);
      gridGroup.appendChild(line);
    }

    for (let y = 0; y <= baseHeight; y += gridMinor) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', baseWidth);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#94a3b8');
      line.setAttribute('stroke-width', y % gridMajor === 0 ? 0.8 : 0.3);
      gridGroup.appendChild(line);
    }

    svg.appendChild(gridGroup);

    // 공간 영역
    const spaceRect = document.createElementNS(SVG_NS, 'rect');
    spaceRect.setAttribute('x', 0);
    spaceRect.setAttribute('y', 0);
    spaceRect.setAttribute('width', spaceWidth);
    spaceRect.setAttribute('height', spaceHeight);
    spaceRect.setAttribute('fill', 'rgba(226, 232, 240, 0.35)');
    spaceRect.setAttribute('stroke', '#94a3b8');
    spaceRect.setAttribute('stroke-dasharray', '6 4');
    svg.appendChild(spaceRect);

    // 매트 영역
    const coverageRect = document.createElementNS(SVG_NS, 'rect');
    coverageRect.setAttribute('x', 0);
    coverageRect.setAttribute('y', 0);
    coverageRect.setAttribute('width', coverageWidth);
    coverageRect.setAttribute('height', coverageHeight);
    coverageRect.setAttribute('fill', 'rgba(37, 99, 235, 0.14)');
    coverageRect.setAttribute('stroke', '#2563eb');
    coverageRect.setAttribute('stroke-width', 1.2);
    svg.appendChild(coverageRect);

    // 타일 또는 스트라이프 렌더링
    if (vis.type === 'puzzle' && Array.isArray(vis.tiles)) {
      vis.tiles.forEach((tile, idx) => {
        const tileRect = document.createElementNS(SVG_NS, 'rect');
        tileRect.setAttribute('x', tile.x);
        tileRect.setAttribute('y', tile.y);
        tileRect.setAttribute('width', tile.width);
        tileRect.setAttribute('height', tile.height);

        if (tile.size === 100) {
          tileRect.setAttribute('fill', 'rgba(37, 99, 235, 0.6)');
          tileRect.setAttribute('stroke', '#1e40af');
          tileRect.setAttribute('stroke-width', 1.2);
        } else {
          tileRect.setAttribute('fill', idx % 2 === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(96, 165, 250, 0.55)');
          tileRect.setAttribute('stroke', '#1d4ed8');
          tileRect.setAttribute('stroke-width', 0.6);
        }

        svg.appendChild(tileRect);

        if (tile.width >= 30 && tile.height >= 30) {
          const centerX = tile.x + tile.width / 2;
          const centerY = tile.y + tile.height / 2;
          const tileLabel = document.createElementNS(SVG_NS, 'text');
          tileLabel.setAttribute('x', centerX);
          tileLabel.setAttribute('y', centerY);
          tileLabel.setAttribute('font-size', Math.min(tile.width, tile.height) * 0.1);
          tileLabel.setAttribute('fill', '#ffffff');
          tileLabel.setAttribute('font-weight', '500');
          tileLabel.setAttribute('text-anchor', 'middle');
          tileLabel.setAttribute('dominant-baseline', 'middle');
          tileLabel.textContent = `${tile.width}×${tile.height}cm`;
          svg.appendChild(tileLabel);
        }
      });
    } else if (vis.type === 'roll' && Array.isArray(vis.stripes)) {
      const colors = ['rgba(59, 130, 246, 0.55)', 'rgba(37, 99, 235, 0.55)', 'rgba(96, 165, 250, 0.55)'];
      vis.stripes.forEach((strip, idx) => {
        const stripRect = document.createElementNS(SVG_NS, 'rect');
        stripRect.setAttribute('x', strip.x);
        stripRect.setAttribute('y', strip.y);
        stripRect.setAttribute('width', strip.width);
        stripRect.setAttribute('height', strip.height);
        stripRect.setAttribute('fill', colors[idx % colors.length]);
        stripRect.setAttribute('stroke', '#1d4ed8');
        stripRect.setAttribute('stroke-width', 0.8);
        svg.appendChild(stripRect);

        const minDimension = Math.min(strip.width, strip.height);
        if (minDimension >= 20) {
          const centerX = strip.x + strip.width / 2;
          const centerY = strip.y + strip.height / 2;
          const stripLabel = document.createElementNS(SVG_NS, 'text');
          stripLabel.setAttribute('x', centerX);
          stripLabel.setAttribute('y', centerY);
          stripLabel.setAttribute('font-size', minDimension * 0.1);
          stripLabel.setAttribute('fill', '#ffffff');
          stripLabel.setAttribute('font-weight', '500');
          stripLabel.setAttribute('text-anchor', 'middle');
          stripLabel.setAttribute('dominant-baseline', 'middle');
          stripLabel.textContent = `${strip.width}×${strip.height}cm`;
          svg.appendChild(stripLabel);
        }
      });
    }

    // 격자 레이블
    const maxDimension = Math.max(baseWidth, baseHeight);
    const fontSize = Math.max(3, maxDimension * 0.015);
    const labelOffset = fontSize * 0.3;

    for (let x = 0; x <= baseWidth; x += gridMajor) {
      if (x === 0) continue;
      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', x);
      labelText.setAttribute('y', -labelOffset);
      labelText.setAttribute('font-size', fontSize);
      labelText.setAttribute('fill', '#64748b');
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('dominant-baseline', 'bottom');
      labelText.textContent = `${x}cm`;
      svg.appendChild(labelText);
    }

    for (let y = 0; y <= baseHeight; y += gridMajor) {
      const labelText = document.createElementNS(SVG_NS, 'text');
      labelText.setAttribute('x', -labelOffset);
      labelText.setAttribute('y', y);
      labelText.setAttribute('font-size', fontSize);
      labelText.setAttribute('fill', '#64748b');
      labelText.setAttribute('text-anchor', 'end');
      labelText.setAttribute('dominant-baseline', 'middle');
      labelText.textContent = `${y}cm`;
      svg.appendChild(labelText);
    }

    container.appendChild(svg);

    // 공간명 레이블
    const spaceName = result.name || `공간 ${result.index}`;
    const spaceNameDiv = document.createElement('div');
    spaceNameDiv.className = 'space-visual-name';
    spaceNameDiv.textContent = spaceName;
    container.appendChild(spaceNameDiv);

    // 정보 레이블
    const info = document.createElement('div');
    info.className = 'space-visual-info';
    info.innerHTML = `
      <div class="space-visual-dim space">공간 ${spaceWidth}cm × ${spaceHeight}cm</div>
      <div class="space-visual-dim coverage">매트 ${coverageWidth}cm × ${coverageHeight}cm</div>
    `;
    container.appendChild(info);
  }

  let copySuccessTimeout = null;

  // 복사 버튼 상태 초기화
  function resetCopyButton() {
    if (copySuccessTimeout) {
      clearTimeout(copySuccessTimeout);
      copySuccessTimeout = null;
    }
    $copyEstimate.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      견적서 복사
    `;
    $copyEstimate.style.background = '';
    $copyEstimate.style.borderColor = '';
    $copyEstimate.style.color = '';
  }

  // 견적서 복사 함수
  function copyEstimate() {
    const text = generateEstimateText();

    // 클립보드에 복사
    navigator.clipboard.writeText(text).then(() => {
      // 성공 메시지
      $copyEstimate.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        복사 완료!
      `;
      $copyEstimate.style.background = '#10b981';
      $copyEstimate.style.borderColor = '#10b981';
      $copyEstimate.style.color = '#fff';

      copySuccessTimeout = setTimeout(() => {
        resetCopyButton();
      }, 2000);
    }).catch(err => {
      alert('복사에 실패했습니다: ' + err);
    });
  }

  // 배송메모 복사 함수
  function copyShippingMemo() {
    if (!lastCalculationResults || lastCalculationResults.activeSpaces === 0) {
      alert('배송메모가 없습니다. 먼저 계산을 실행해주세요.');
      return;
    }

    const { spaceResults, shippingMemos } = lastCalculationResults;

    if (!shippingMemos || shippingMemos.length === 0) {
      alert('배송메모가 없습니다.');
      return;
    }

    // 배송메모 텍스트 생성 (공간별로 구분)
    let memoText = '';
    spaceResults.forEach((r, idx) => {
      if (r.shippingMemo && r.shippingMemo !== '배송메모 : 없음') {
        const spaceName = r.name || `공간 ${idx + 1}`;
        memoText += `${spaceName}\n`;
        memoText += `${r.shippingMemo}\n`;
        if (idx < spaceResults.length - 1) memoText += '\n';
      }
    });

    if (!memoText) {
      alert('배송메모가 없습니다.');
      return;
    }

    // 클립보드에 복사
    navigator.clipboard.writeText(memoText).then(() => {
      // 성공 메시지
      $copyShippingMemo.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        복사 완료!
      `;
      $copyShippingMemo.style.background = '#10b981';
      $copyShippingMemo.style.borderColor = '#10b981';
      $copyShippingMemo.style.color = '#fff';

      setTimeout(() => {
        $copyShippingMemo.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          배송메모 복사
        `;
        $copyShippingMemo.style.background = '';
        $copyShippingMemo.style.borderColor = '';
        $copyShippingMemo.style.color = '';
      }, 2000);
    }).catch(err => {
      alert('복사에 실패했습니다: ' + err);
    });
  }

  // 계산 방식 탭 초기화
  function initCalcModeTabs() {
    const calcModeBtns = document.querySelectorAll('.calc-mode-btn');
    const hiddenInput = document.getElementById('calc-mode-value');

    calcModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;

        // 모든 버튼에서 active 제거
        calcModeBtns.forEach(b => b.classList.remove('active'));

        // 선택된 버튼 활성화
        btn.classList.add('active');

        // hidden input 업데이트
        hiddenInput.value = mode;

        // 재계산
        calculate();
      });
    });
  }

  // 이벤트 리스너 등록
  $addSpace.addEventListener('click', addSpace);
  $copyEstimate.addEventListener('click', copyEstimate);
  $copyShippingMemo.addEventListener('click', copyShippingMemo);

  // 제품 탭 초기화
  initProductTabs();

  // 계산 방식 탭 초기화
  initCalcModeTabs();

  // 초기 제품 정보 로드
  updateProductDisplay('puzzle');

  // 초기 공간 1개 추가
  addSpace();
})();
