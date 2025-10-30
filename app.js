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

  // 여유 해의 부족폭이 이 값 이상이면 정확(재단) 해를 기본 선택으로 전환
  const SHORTAGE_SWITCH_CM = 10;

  // 정확(≥) 조합에서 허용하는 최대 과충족(cm)
  const EXACT_OVERAGE_CAP_CM = 20;
  // 여유 조합 부족폭이 클 때 대체 조합 탐색 기준(cm)
  const SHORTAGE_FORCE_ALT_CM = 20;
  // 대체 조합 탐색 시 허용할 최대 과충족(cm)
  const EXTENDED_EXACT_OVERAGE_CAP_CM = 80;

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
      imageReal: './images/product_03.jpg',  // 실제 이미지 경로
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
      messages.push(`가로로 ${Math.abs(widthDiff)}cm 공간이 남습니다.`);
    }

    if (heightDiff > 0) {
      messages.push(`세로로 ${heightDiff}cm 재단이 필요합니다.`);
    } else if (heightDiff < 0) {
      messages.push(`세로로 ${Math.abs(heightDiff)}cm 공간이 남습니다.`);
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

    let targetWidth, targetLength;  // 롤매트의 폭과 길이
    let widthAxis = 'width'; // 롤 폭이 가로 방향을 덮는지 여부

    if (width50 && !height50) {
      // 가로가 50cm 배수 → 가로를 길이로
      targetLength = width;
      targetWidth = height;
      widthAxis = 'height';
    } else if (!width50 && height50) {
      // 세로가 50cm 배수 → 세로를 길이로
      targetLength = height;
      targetWidth = width;
      widthAxis = 'width';
    } else {
      // 둘 다 50cm 배수이거나 둘 다 아님 → 작은 쪽을 폭으로
      if (width <= height) {
        targetWidth = width;
        targetLength = height;
        widthAxis = 'width';
      } else {
        targetWidth = height;
        targetLength = width;
        widthAxis = 'height';
      }
    }

    // 2. 최적 폭 조합 찾기: 기본은 여유(≤), 대안으로 정확(≥)도 함께 계산
    const looseSolutions = findBestRollWidthCombination(targetWidth, 'loose');
    const exactSolutions = findBestRollWidthCombination(targetWidth, 'exact');

    // 2-A. 고객 선호 규칙 적용: 해당 구간이면 우선 사용
    function matchPreferredRule(targetWidth, loose, exact) {
      if (!PREFERRED_WIDTH_RULES || PREFERRED_WIDTH_RULES.length === 0) return null;
      const rule = PREFERRED_WIDTH_RULES.find(r => targetWidth >= r.min && targetWidth <= r.max);
      if (!rule) return null;
      // 현재 구현에서는 첫 선호안만 검사
      const pref = rule.prefer[0];
      if (!pref) return null;
      const isLoose = pref.mode === 'loose';
      const candidate = isLoose ? loose : exact;
      if (!candidate) return null;
      if (candidate.length !== 1) return null;
      const only = candidate[0];
      if (only.width === pref.width && only.count === pref.count) {
        return candidate;
      }
      return null;
    }

    // 2-B. "남는공간 10cm 이하이면 작은 조합 선호" 규칙 (여유 해 존재 시 우선 적용)
    function preferSmallIfTinyGap(targetWidth, loose) {
      if (!loose) return null;
      const looseUsed = loose.reduce((s, x) => s + x.width * x.count, 0);
      const gap = targetWidth - looseUsed; // >0이면 부족
      if (gap > 0 && gap <= 10) return loose;
      return null;
    }

    // 2-C. 부족폭이 큰 경우(≥ SHORTAGE_SWITCH_CM) 정확 해로 전환
    function switchToExactIfLargeShortage(targetWidth, loose, exact) {
      if (!loose || !exact) return null;
      const looseUsed = loose.reduce((s, x) => s + x.width * x.count, 0);
      const gap = targetWidth - looseUsed; // >0이면 부족
      if (gap >= SHORTAGE_SWITCH_CM) return exact;
      return null;
    }

    let solutions = preferSmallIfTinyGap(targetWidth, looseSolutions)
      || matchPreferredRule(targetWidth, looseSolutions, exactSolutions)
      || switchToExactIfLargeShortage(targetWidth, looseSolutions, exactSolutions)
      || looseSolutions
      || exactSolutions;

    if (!solutions || solutions.length === 0) {
      return null;
    }

    // 여유 조합에서 부족폭이 크게 남을 경우 확장 정확 조합으로 전환 시도
    if (solutions === looseSolutions && looseSolutions) {
      const looseUsedWidth = looseSolutions.reduce((sum, sol) => sum + (sol.width * sol.count), 0);
      const looseGap = targetWidth - looseUsedWidth;
      if (looseGap >= SHORTAGE_FORCE_ALT_CM) {
        const extendedExactSolutions = findBestRollWidthCombination(
          targetWidth,
          'exact',
          { exactOverageCap: EXTENDED_EXACT_OVERAGE_CAP_CM }
        );
        if (extendedExactSolutions) {
          solutions = extendedExactSolutions;
        }
      }
    }

    // 3. 길이 계산 (50cm 단위, 최대 길이 제한 적용)
    const thickness = parseInt(currentThickness);
    const maxLength = ROLL_MAX_LENGTH[thickness] || Infinity;
    
    let calculatedLength;
    if (mode === 'exact') {
      calculatedLength = ceilDiv(targetLength, 50) * 50;
    } else {
      calculatedLength = ceilDiv(targetLength, 50) * 50;  // 길이는 항상 올림
    }
    
    // 최대 길이 초과 시 균등 분할
    let rollLength, splitCount;
    if (calculatedLength <= maxLength) {
      // 한 롤로 가능
      rollLength = calculatedLength;
      splitCount = 1;
    } else {
      // 균등 분할 (가장 적은 분할로)
      const fullRolls = Math.ceil(calculatedLength / maxLength);
      rollLength = Math.ceil(calculatedLength / fullRolls / 50) * 50;  // 50cm 단위로 올림
      splitCount = fullRolls;
    }

    // 4. 가격 계산 (두께별 가격 적용)
    const lengthIn50cm = rollLength / 50;  // 50cm 단위 개수
    let totalPrice = 0;
    let breakdown = [];

    solutions.forEach(sol => {
      const pricePerUnit = ROLL_PRICES[thickness][sol.width];  // 50cm 당 가격
      const price = pricePerUnit * lengthIn50cm * sol.count * splitCount;
      totalPrice += price;
      
      if (isPet) {
        // 애견 롤매트: 폭별 정보와 구매 단위를 한 줄에 표시
        const units = lengthIn50cm * sol.count * splitCount;
        const countText = splitCount > 1 ? `${sol.count}개 × ${splitCount}롤` : `${sol.count}개`;
        breakdown.push(`${getThicknessLabel()} - ${sol.width}cm 폭 × ${rollLength}cm 길이 × ${countText} (50cm ${units}개 구매)`);
      } else {
        const countText = splitCount > 1 ? `${sol.count}개 × ${splitCount}롤` : `${sol.count}개`;
        breakdown.push(`${getThicknessLabel()} - ${sol.width}cm 폭 × ${rollLength}cm 길이 × ${countText}`);
      }
    });

    // 5. 낭비율 계산
    const actualArea = width * height;
    const usedWidth = solutions.reduce((sum, sol) => sum + (sol.width * sol.count), 0);
    const totalUsedLength = rollLength * splitCount;
    const usedArea = usedWidth * totalUsedLength;
    const wastePercent = actualArea > 0 ? Math.round(((usedArea - actualArea) / usedArea) * 100) : 0;
    const coverageWidth = widthAxis === 'width' ? usedWidth : totalUsedLength;
    const coverageHeight = widthAxis === 'width' ? totalUsedLength : usedWidth;
    const totalRolls = solutions.reduce((sum, sol) => sum + sol.count, 0) * splitCount;
    const totalRollUnits = lengthIn50cm * totalRolls;
    const lengthText = formatLength(rollLength);
    
    let shippingMemo = '';
    if (isPet) {
      // 애견 롤매트 배송메모: 폭별로 재단 요청 명기
      if (solutions.length > 0) {
        const cutRequestList = solutions.map(sol => {
          const meters = formatLength(rollLength);
          const totalRolls = sol.count * splitCount;
          const rollText = splitCount > 1 ? `${totalRolls}롤` : `${sol.count}롤`;
          return `${sol.width}cm 폭 ${meters} ${rollText}`;
        });
        shippingMemo = `배송메모(재단요청): ${cutRequestList.join(', ')}으로 재단`;
        breakdown.push(shippingMemo);
      }
    }

    const rollLabel = isPet ? '애견 롤매트' : '유아 롤매트';

    // 6-A. 대안 옵션 표시: 선택되지 않은 다른 모드 해를 함께 제안
    const alternativeLines = [];
    const otherSolutions = (solutions === exactSolutions) ? looseSolutions : exactSolutions;
    if (otherSolutions) {
      let altPrice = 0;
      otherSolutions.forEach(sol => {
        const pricePerUnit = ROLL_PRICES[thickness][sol.width];
        const price = pricePerUnit * lengthIn50cm * sol.count * splitCount;
        altPrice += price;
      });

      const otherUsedWidth = otherSolutions.reduce((s, x) => s + x.width * x.count, 0);
      const overWidth = Math.max(0, otherUsedWidth - targetWidth);
      const rollText = splitCount > 1 ? `${splitCount}롤` : `${otherSolutions.reduce((s, x) => s + x.count, 0)}개`;

      // 구성 문자열 생성
      const comboText = otherSolutions.map(sol => `${sol.width}cm 폭 × ${rollLength}cm 길이 × ${splitCount > 1 ? `${sol.count}개 × ${splitCount}롤` : `${sol.count}개`}`).join(' + ');
      const diff = altPrice - totalPrice;
      const priceDiffText = diff === 0 ? '' : (diff > 0 ? ` (+${KRW.format(diff)})` : ` (${KRW.format(diff)})`);

      alternativeLines.push(`대안 옵션(고객 선호): ${getThicknessLabel()} - ${comboText} = ${KRW.format(altPrice)}${priceDiffText}`);
      if (widthAxis === 'width' && overWidth > 0) {
        alternativeLines.push(`안내: 가로로 ${overWidth}cm 재단이 필요합니다.`);
      }
    }

    // 6-B. 보완 옵션 계산 제거: 기본 결과만 표시
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
      shippingMemo
    };
  }

  // 최적의 롤매트 폭 조합 찾기
  function findBestRollWidthCombination(targetWidth, mode, { exactOverageCap = EXACT_OVERAGE_CAP_CM } = {}) {
    const availableWidths = getAvailableRollWidths();
    const allCombinations = [];

    // 1. 모든 가능한 단일 폭 조합
    for (let width of availableWidths) {
      for (let count = 1; count <= 10; count++) {
        const totalWidth = width * count;

        if (mode === 'exact') {
          // 정확히 맞추기: targetWidth 이상, 과충족은 exactOverageCap 이내
          if (totalWidth >= targetWidth && totalWidth <= targetWidth + exactOverageCap) {
            const waste = totalWidth - targetWidth;
            const wastePercent = (waste / totalWidth) * 100;

            allCombinations.push({
              solutions: [{ width, count }],
              totalWidth,
              waste,
              wastePercent,
              rollCount: count,
              priority: ROLL_WIDTH_PRIORITY[width] || 2,
              sameWidth: true
            });

            break; // 더 많은 개수는 불필요
          }
        } else {
          // 여유있게 깔기: targetWidth 이하
          if (totalWidth <= targetWidth) {
            const shortage = targetWidth - totalWidth;
            const shortagePercent = (shortage / targetWidth) * 100;

            allCombinations.push({
              solutions: [{ width, count }],
              totalWidth,
              waste: -shortage,  // 음수로 표시
              wastePercent: -shortagePercent,
              rollCount: count,
              priority: ROLL_WIDTH_PRIORITY[width] || 2,
              sameWidth: true
            });
          } else {
            break; // 초과하면 중단
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
              const avgPriority = ((ROLL_WIDTH_PRIORITY[w1] || 2) + (ROLL_WIDTH_PRIORITY[w2] || 2)) / 2;

              allCombinations.push({
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
              const avgPriority = ((ROLL_WIDTH_PRIORITY[w1] || 2) + (ROLL_WIDTH_PRIORITY[w2] || 2)) / 2;

              allCombinations.push({
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

    if (allCombinations.length === 0) {
      return null;
    }

    // 정렬 기준:
    // 1) 낭비율 절대값이 작을수록 좋음
    // 2) 동일 폭 우선
    // 3) 우선순위 높은 폭
    // 4) 롤 개수 적을수록 좋음
    allCombinations.sort((a, b) => {
      // 낭비율 비교
      const wasteA = Math.abs(a.wastePercent);
      const wasteB = Math.abs(b.wastePercent);

      if (Math.abs(wasteA - wasteB) > 5) {  // 5% 이상 차이나면 낭비율 우선
        return wasteA - wasteB;
      }

      // 낭비율이 비슷하면 동일 폭 우선
      if (a.sameWidth !== b.sameWidth) {
        return b.sameWidth - a.sameWidth;
      }

      // 우선순위 비교
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // 롤 개수 비교
      return a.rollCount - b.rollCount;
    });

    return allCombinations[0].solutions;
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

    return {
      name: name,
      width: W,
      height: H,
      mode: mode === 'exact' ? '정확히 맞추기' : '여유있게 깔기',
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
          const hasGap = result.fitMessages.some(msg => msg.includes('공간이 남습니다'));
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
        // 재단/여유 안내 메시지 표시 (작은 글씨)
        if (r.fitMessages && r.fitMessages.length > 0) {
          totalCompositionHTML += `<div style="margin-top: 10px;"></div>`;
          r.fitMessages.forEach(msg => {
            totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 4px; color: #64748b; font-size: 12px;">${msg}</div>`;
          });
        }
        if (idx < spaceResults.length - 1) {
          totalCompositionHTML += `<div style="margin: 18px 0; border-top: 2px solid #e2e8f0;"></div>`;
        }
      });
    } else {
      totalCompositionHTML = '-';
    }
    $totalComposition.innerHTML = totalCompositionHTML;

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

    text += '[ 제품 정보 ]\n';
    text += `제품: ${productInfo.name} - ${getThicknessLabel()}\n`;
    // 퍼즐매트만 계산방식 표시
    if (currentProduct === 'puzzle') {
      text += `계산방식: ${calcModeText}\n`;
    }
    text += '\n';

    text += '[ 총 구성 ]\n';
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

    text += '\n[ 총 가격 (할인 미적용가) ]\n';
    text += `${KRW.format(totalPrice)}`;

    return text;
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
