(function () {
  const KRW = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

  const $calc = document.getElementById('calc');
  const $addSpace = document.getElementById('add-space');
  const $copyEstimate = document.getElementById('copy-estimate');
  const $spacesContainer = document.getElementById('spaces-container');
  const $results = document.getElementById('results');
  const $totalSpaces = document.getElementById('total-spaces');
  const $totalPcs = document.getElementById('total-pcs');
  const $totalWaste = document.getElementById('total-waste');
  const $totalPrice = document.getElementById('total-price');

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
    17: { 70: 10700, 110: 13800, 120: 15100, 125: 16100, 140: 18200 },
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

  // 제품 이미지가 존재하는지 확인하는 함수
  function checkImageExists(imagePath, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = imagePath;
  }

  // 두께 선택 UI 업데이트
  function updateThicknessSelector() {
    const $thicknessSelector = document.getElementById('thickness-selector');
    const $thicknessPriceInfo = document.getElementById('thickness-price-info');

    let thicknesses = [];
    let priceInfo = '';

    if (currentProduct === 'puzzle') {
      thicknesses = [
        { value: '25', label: '25T' },
        { value: '25plus', label: '25T Plus+' },
        { value: '40', label: '40T' }
      ];
      currentThickness = currentThickness || '25';
      priceInfo = '100×100cm (1pcs) 또는 50×50cm (4pcs 세트) 기준';
    } else if (currentProduct === 'babyRoll') {
      thicknesses = [
        { value: '12', label: '12T' },
        { value: '14', label: '14T' },
        { value: '17', label: '17T' },
        { value: '22', label: '22T' }
      ];
      currentThickness = ['12', '14', '17', '22'].includes(currentThickness) ? currentThickness : '12';
      priceInfo = '50cm 기준 가격 (폭별 상이)';
    } else if (currentProduct === 'petRoll') {
      thicknesses = [
        { value: '6', label: '6T' },
        { value: '9', label: '9T' },
        { value: '12', label: '12T' }
      ];
      currentThickness = ['6', '9', '12'].includes(currentThickness) ? currentThickness : '9';
      priceInfo = '50cm 기준 가격 (길이 추가 방식)';
    }

    // 두께 버튼 생성
    $thicknessSelector.innerHTML = thicknesses.map(t =>
      `<button class="thickness-btn ${t.value === currentThickness ? 'active' : ''}" data-thickness="${t.value}">${t.label}</button>`
    ).join('');

    $thicknessPriceInfo.textContent = priceInfo;

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

    const $productImage = document.getElementById('product-image');
    const $productDescription = document.getElementById('product-description');
    const $productLink = document.getElementById('product-link');

    // 실제 이미지가 있는지 확인하고, 없으면 플레이스홀더 사용
    checkImageExists(product.imageReal, (exists) => {
      $productImage.src = exists ? product.imageReal : product.image;
      $productImage.alt = product.name;
    });

    $productDescription.textContent = product.description;
    $productLink.href = product.link;

    // 두께 선택 UI 업데이트
    updateThicknessSelector();

    // 기존 공간들의 매트 타입 옵션 업데이트
    updateAllSpaceMatTypes();
  }

  // 모든 공간의 매트 타입 옵션을 현재 제품에 맞게 업데이트
  function updateAllSpaceMatTypes() {
    const allSpaceTypes = document.querySelectorAll('.space-type');
    const optionsHTML = getMatTypeOptionsHTML();

    allSpaceTypes.forEach(select => {
      select.innerHTML = optionsHTML;
    });

    // 자동 재계산
    calculate();
  }

  // 탭 버튼 클릭 이벤트
  function initProductTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

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

  // 현재 제품에 맞는 매트 타입 옵션 HTML 생성
  function getMatTypeOptionsHTML() {
    if (currentProduct === 'puzzle') {
      return `
        <option value="50">50×50cm (4pcs 세트)</option>
        <option value="100">100×100cm (1pcs)</option>
        <option value="hybrid" selected>복합 (최적화)</option>
      `;
    } else if (currentProduct === 'babyRoll') {
      return `
        <option value="roll" selected>유아 롤매트 (110/125/140cm 폭)</option>
      `;
    } else if (currentProduct === 'petRoll') {
      return `
        <option value="petRoll" selected>애견 롤매트 (110/125/140cm 폭)</option>
      `;
    }
    return '';
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
      <label>
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
      <label>
        <span>매트 타입</span>
        <select class="space-type">
          ${getMatTypeOptionsHTML()}
        </select>
      </label>
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
      getType: () => spaceDiv.querySelector('.space-type').value
    });

    calculate();
  }

  // 공간 삭제 함수
  function removeSpace(id) {
    const index = spaces.findIndex(s => s.id === id);
    if (index !== -1) {
      spaces[index].element.remove();
      spaces.splice(index, 1);
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
    const selected = document.querySelector('input[name="calc-mode"]:checked');
    return selected ? selected.value : 'exact';
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

    // 2. 최적 폭 조합 찾기
    const solutions = findBestRollWidthCombination(targetWidth, mode);

    if (!solutions || solutions.length === 0) {
      return null;
    }

    // 3. 길이 계산 (50cm 단위)
    let calculatedLength;
    if (mode === 'exact') {
      calculatedLength = ceilDiv(targetLength, 50) * 50;
    } else {
      calculatedLength = floorDiv(targetLength, 50) * 50;
    }

    // 4. 가격 계산 (두께별 가격 적용)
    const thickness = parseInt(currentThickness);
    const lengthIn50cm = calculatedLength / 50;  // 50cm 단위 개수
    let totalPrice = 0;
    let breakdown = [];

    solutions.forEach(sol => {
      const pricePerUnit = ROLL_PRICES[thickness][sol.width];  // 50cm 당 가격
      const price = pricePerUnit * lengthIn50cm * sol.count;
      totalPrice += price;
      breakdown.push(`${sol.width}cm 폭 × ${calculatedLength}cm 길이 × ${sol.count}개`);
    });

    // 5. 낭비율 계산
    const actualArea = width * height;
    const usedWidth = solutions.reduce((sum, sol) => sum + (sol.width * sol.count), 0);
    const usedArea = usedWidth * calculatedLength;
    const wastePercent = actualArea > 0 ? Math.round(((usedArea - actualArea) / usedArea) * 100) : 0;
    const coverageWidth = widthAxis === 'width' ? usedWidth : calculatedLength;
    const coverageHeight = widthAxis === 'width' ? calculatedLength : usedWidth;
    const rollCount = solutions.reduce((sum, sol) => sum + sol.count, 0);
    const totalRollUnits = lengthIn50cm * rollCount;
    const lengthText = formatLength(calculatedLength);
    const cutGuideList = solutions.map(sol => `${lengthText} ${sol.count}롤`);
    const cutGuide = cutGuideList.join(', ');
    const rollPurchaseMessage = (isPet && lengthIn50cm > 0) ? `50cm ${totalRollUnits}개 구매` : '';
    const rollCutMessage = (isPet && cutGuide) ? `${cutGuide}로 재단` : '';
    let shippingMemo = '';
    if (isPet) {
      shippingMemo = cutGuide ? `배송메모 : ${cutGuide}로 재단` : '배송메모 : 없음';
      if (rollPurchaseMessage) breakdown.push(rollPurchaseMessage);
      if (rollCutMessage) breakdown.push(rollCutMessage);
    }

    const rollLabel = isPet ? '애견 롤매트' : '유아 롤매트';

    return {
      type: `${rollLabel} - ${getThicknessLabel()}`,
      targetWidth,
      targetLength,
      calculatedLength,
      solutions,
      totalPrice,
      price: totalPrice,
      wastePercent,
      breakdown,
      coverageWidth,
      coverageHeight,
      fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight),
      pcs: rollCount,
      rollCount,
      totalRollUnits,
      rollPurchaseMessage,
      rollCutMessage,
      shippingMemo
    };
  }

  // 최적의 롤매트 폭 조합 찾기
  function findBestRollWidthCombination(targetWidth, mode) {
    const availableWidths = getAvailableRollWidths();
    const allCombinations = [];

    // 1. 모든 가능한 단일 폭 조합
    for (let width of availableWidths) {
      for (let count = 1; count <= 10; count++) {
        const totalWidth = width * count;

        if (mode === 'exact') {
          // 정확히 맞추기: targetWidth 이상
          if (totalWidth >= targetWidth) {
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
            if (totalWidth >= targetWidth && totalWidth <= targetWidth * 1.3) {
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
    if (total100 > 0) breakdown.push(`100cm 매트: ${total100}장`);
    if (total50Sets > 0) breakdown.push(`50cm 매트: ${total50Sets}세트 (${total50Tiles}개 타일)`);

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
      name: name || '이름 없음',
      width: W,
      height: H,
      mode: mode === 'exact' ? '정확히 맞추기' : '여유있게 깔기',
      ...result
    };
  }

  function calculate() {
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

    // 결과 표시
    displayResults(spaceResults);

    // 총합 표시
    $totalSpaces.textContent = String(activeSpaces);
    let totalPcsText = '-';
    if (activeSpaces > 0) {
      if (currentProduct === 'puzzle') {
        totalPcsText = total100 > 0 ?
          `100cm: ${total100}장 / 50cm: ${total50}장` :
          `${total50}장`;
      } else if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
        totalPcsText = totalRolls > 0 ?
          `${totalRolls}롤 (50cm ${totalRollUnits}개)` :
          '0롤';
      }
    }
    $totalPcs.textContent = totalPcsText;
    $totalWaste.textContent = activeSpaces > 0 ? fitSummary : '-';
    $totalPrice.textContent = activeSpaces > 0 ? KRW.format(totalPrice) : '-';
  }

  function displayResults(results) {
    if (results.length === 0) {
      $results.innerHTML = '<div class="muted">공간 데이터를 입력해주세요.</div>';
      return;
    }

    let html = '';
    results.forEach(r => {
      const spaceName = r.name || `공간 ${r.index}`;
      html += `
        <div class="space-result">
          <h3>${spaceName}</h3>
          <div class="result">
            <div>공간 크기: <strong>${r.width}cm × ${r.height}cm</strong></div>
            <div>계산방식: <strong>${r.mode}</strong></div>
            <div>매트 타입: <strong>${r.type}</strong></div>
      `;

      // 롤매트인 경우 특별 처리
      if (r.type.includes('롤매트') && r.solutions) {
        html += `<div>배치: <strong>폭 ${r.targetWidth}cm × 길이 ${r.calculatedLength}cm</strong></div>`;
      }

      if (r.breakdown && r.breakdown.length > 0) {
        html += `<div>구성: <strong>${r.breakdown.join('<br>')}</strong></div>`;
      }

      if (r.totalPcs !== undefined) {
        html += `<div>총 장수: <strong>${r.totalPcs}장</strong></div>`;
      } else if (r.pcs !== undefined) {
        html += `<div>총 장수: <strong>${r.pcs}장</strong></div>`;
      }

      if (r.fitMessages && r.fitMessages.length > 0) {
        html += `<div>재단/여유 안내: <strong>${r.fitMessages.join('<br>')}</strong></div>`;
      }

      if (r.rollPurchaseMessage) {
        html += `<div>구매 안내: <strong>${r.rollPurchaseMessage}</strong></div>`;
      }

      if (r.rollCutMessage) {
        html += `<div>재단 안내: <strong>${r.rollCutMessage}</strong></div>`;
      }

      if (r.shippingMemo) {
        html += `<div>${r.shippingMemo}</div>`;
      }

      html += `
            <div>예상가: <strong>${KRW.format(r.price)}</strong></div>
          </div>
        </div>
      `;
    });
    $results.innerHTML = html;
  }

  // 견적서 텍스트 생성 함수
  function generateEstimateText() {
    if (!lastCalculationResults || lastCalculationResults.activeSpaces === 0) {
      return '견적 결과가 없습니다. 먼저 계산을 실행해주세요.';
    }

    const {
      spaceResults,
      activeSpaces,
      total50,
      total100,
      totalPrice,
      fitSummary,
      totalRolls,
      totalRollUnits,
      shippingMemos
    } = lastCalculationResults;
    const today = new Date().toLocaleDateString('ko-KR');

    let text = '======================\n';
    text += '   매트견적 계산서\n';
    text += '======================\n';
    text += `작성일: ${today}\n\n`;

    text += '[ 제품 정보 ]\n';
    const productInfo = PRODUCTS[currentProduct];
    text += `${productInfo.name} (${getThicknessLabel()})\n`;

    if (currentProduct === 'puzzle') {
      const price = getCurrentPrice();
      text += `- 100×100cm (1pcs): ${KRW.format(price)}\n`;
      text += `- 50×50cm (4pcs 세트): ${KRW.format(price)}\n\n`;
    } else if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
      text += '- 가격은 폭과 길이(50cm 단위)에 따라 상이합니다\n';
      const thickness = parseInt(currentThickness);
      const widths = getAvailableRollWidths();
      widths.forEach(width => {
        const pricePerUnit = ROLL_PRICES[thickness][width];
        text += `  ${width}cm 폭: ${KRW.format(pricePerUnit)}/50cm\n`;
      });
      text += '\n';
    }

    text += '[ 공간별 상세 ]\n';
    spaceResults.forEach((r, idx) => {
      text += `\n${idx + 1}. ${r.name || `공간 ${r.index}`}\n`;
      text += `   공간 크기: ${r.width}cm × ${r.height}cm\n`;
      text += `   계산방식: ${r.mode}\n`;
      text += `   매트 타입: ${r.type}\n`;
      if (r.breakdown && r.breakdown.length > 0) {
        text += `   구성: ${r.breakdown.join(', ')}\n`;
      }
      if (r.totalPcs !== undefined) {
        text += `   총 장수: ${r.totalPcs}장\n`;
      } else if (r.pcs !== undefined) {
        text += `   총 장수: ${r.pcs}장\n`;
      }
      if (r.fitMessages && r.fitMessages.length > 0) {
        text += `   재단/여유: ${r.fitMessages.join(' / ')}\n`;
      }
      if (r.rollPurchaseMessage) {
        text += `   구매 안내: ${r.rollPurchaseMessage}\n`;
      }
      if (r.rollCutMessage) {
        text += `   재단 안내: ${r.rollCutMessage}\n`;
      }
      if (r.shippingMemo) {
        text += `   ${r.shippingMemo}\n`;
      }
      text += `   예상가: ${KRW.format(r.price)}\n`;
    });

    text += '\n======================\n';
    text += '[ 전체 합계 ]\n';
    text += `총 공간 수: ${activeSpaces}개\n`;
    if (currentProduct === 'puzzle') {
      if (total100 > 0) {
        text += `총 장수: 100cm ${total100}장 / 50cm ${total50}세트\n`;
      } else {
        text += `총 장수: 50cm ${total50}세트\n`;
      }
    } else if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
      text += `총 롤 수: ${totalRolls}롤\n`;
      text += `총 구매 수량: 50cm ${totalRollUnits}개\n`;
    }
    if (fitSummary) {
      text += `재단/여유 안내: ${fitSummary}\n`;
    }
    if (shippingMemos && shippingMemos.length > 0) {
      text += `배송메모 요약: ${shippingMemos.join(' / ')}\n`;
    }
    text += `총 예상가: ${KRW.format(totalPrice)}\n`;
    text += '======================\n';

    return text;
  }

  // 견적서 복사 함수
  function copyEstimate() {
    const text = generateEstimateText();

    // 클립보드에 복사
    navigator.clipboard.writeText(text).then(() => {
      // 성공 메시지
      const originalText = $copyEstimate.textContent;
      $copyEstimate.textContent = '✅ 복사 완료!';
      $copyEstimate.style.background = '#28a745';

      setTimeout(() => {
        $copyEstimate.textContent = originalText;
        $copyEstimate.style.background = '';
      }, 2000);
    }).catch(err => {
      alert('복사에 실패했습니다: ' + err);
    });
  }

  // 이벤트 리스너 등록
  $addSpace.addEventListener('click', addSpace);
  $calc.addEventListener('click', calculate);
  $copyEstimate.addEventListener('click', copyEstimate);

  // 계산 모드 변경 시 자동 재계산
  document.querySelectorAll('input[name="calc-mode"]').forEach(radio => {
    radio.addEventListener('change', calculate);
  });

  // 제품 탭 초기화
  initProductTabs();

  // 초기 제품 정보 로드
  updateProductDisplay('puzzle');

  // 초기 공간 1개 추가
  addSpace();
})();
