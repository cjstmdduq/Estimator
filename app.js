(function () {
  // ========== 모듈 의존성 ==========
  // 필수 모듈: constants.js, prices.js, utils.js, calculations.js, visualization.js
  // 위 모듈들이 먼저 로드되어야 함

  // ========== DOM 요소 참조 ==========
  const $addSpace = document.getElementById('add-space');
  const $copyEstimate = document.getElementById('copy-estimate');
  const $purchaseLink = document.getElementById('purchase-link');
  const $spacesContainer = document.getElementById('spaces-container');
  const $totalSummary = document.getElementById('total-summary');
  const $totalComposition = document.getElementById('total-composition');
  const $calcModeSection = document.querySelector('.calc-mode-card') || document.querySelector('[data-calc-mode-section]');
  const $calcModeAutoButton = document.getElementById('calc-mode-auto');
  let calcModeButtons = [];

  // ========== 전역 상태 ==========
  let spaceCounter = 0;
  const spaces = [];
  let lastCalculationResults = [];  // 마지막 계산 결과 저장
  let copySuccessTimeout = null;  // 견적 복사 버튼 타임아웃

  let currentProduct = 'babyRoll';
  let currentThickness = '25';  // 기본 두께

  // 제품별 마지막 선택 두께 기억 (제품 간 이동 시 이전 선택 유지)
  const productThicknessMemory = {};

  // ========== 제품 정보 ==========
  const PRODUCTS = {
    puzzle: {
      name: '퍼즐매트',
      image: './assets/images/products/product2.png',
      imageReal: './assets/images/estimator/product_03.jpg',
      description: '두께 선택: 25T / 25T Plus+ / 40T',
      link: 'https://brand.naver.com/ddasaroom/products/5994906898'
    },
    babyRoll: {
      name: '유아 롤매트',
      image: './assets/images/products/product1.png',
      imageReal: './assets/images/estimator/product_01.jpg',
      description: '두께 선택: 12T / 17T / 22T',
      link: 'https://brand.naver.com/ddasaroom/products/6092903705'
    },
    petRoll: {
      name: '애견 롤매트',
      image: './assets/images/products/product5.png',
      imageReal: './assets/images/estimator/product_02.jpg',
      description: '두께 선택: 6T / 9T / 12T',
      link: 'https://brand.naver.com/ddasaroom/products/4200445704'
    },
  };


  // ========== UI 관리 함수 ==========
  // 두께 선택 UI 업데이트
  function updateThicknessSelector() {
    const $thicknessSelector = document.getElementById('thickness-selector');

    let thicknesses = [];
    let defaultThickness = currentThickness;

    // product-config.js에서 제품 설정 가져오기 (있으면)
    if (typeof getProductConfig === 'function') {
      const config = getProductConfig(currentProduct);
      if (config) {
        thicknesses = config.thicknesses || [];
        defaultThickness = config.defaultThickness || currentThickness;

        // 이 제품에 대해 이전에 선택한 두께가 있으면 사용
        if (productThicknessMemory[currentProduct]) {
          currentThickness = productThicknessMemory[currentProduct];
        } else {
          // 없으면 현재 두께가 유효한지 확인
          const validValues = thicknesses.map(t => t.value);
          if (!validValues.includes(currentThickness)) {
            currentThickness = defaultThickness;
          }
        }
      }
    } else {
      // 폴백: 기존 로직
      if (currentProduct === 'puzzle') {
        thicknesses = [
          { value: '25', label: '25T' },
          { value: '25plus', label: '25T Plus+' },
          { value: '40', label: '40T' }
        ];
        defaultThickness = '25';
      } else if (currentProduct === 'babyRoll') {
        thicknesses = [
          { value: '12', label: '12T' },
          { value: '17', label: '17T' },
          { value: '22', label: '22T' }
        ];
        defaultThickness = '17';
      } else if (currentProduct === 'petRoll') {
        thicknesses = [
          { value: '6', label: '6T' },
          { value: '9', label: '9T' },
          { value: '12', label: '12T' }
        ];
        defaultThickness = '9';

      }

      // 이 제품에 대해 이전에 선택한 두께가 있으면 사용
      if (productThicknessMemory[currentProduct]) {
        currentThickness = productThicknessMemory[currentProduct];
      } else {
        // 없으면 현재 두께가 유효한지 확인
        const validValues = thicknesses.map(t => t.value);
        if (!validValues.includes(currentThickness)) {
          currentThickness = defaultThickness;
        }
      }
    }

    // 두께 버튼 생성
    $thicknessSelector.innerHTML = thicknesses.map(t =>
      `<button class="thickness-btn ${t.value === currentThickness ? 'active' : ''}" data-thickness="${t.value}">${t.label}</button>`
    ).join('');

    // 이벤트 리스너 등록
    document.querySelectorAll('.thickness-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentThickness = btn.dataset.thickness;
        // 제품별로 선택한 두께 기억
        productThicknessMemory[currentProduct] = currentThickness;
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
    if (typeof getProductConfig === 'function') {
      const config = getProductConfig(productType);
      if (config && config.defaultThickness) {
        currentThickness = config.defaultThickness;
      }
    } else {
      // 폴백: 기존 로직
      if (productType === 'puzzle') {
        currentThickness = '25';  // 퍼즐매트 기본: 25T
      } else if (productType === 'babyRoll') {
        currentThickness = '12';   // 유아 롤매트 기본: 12T
      } else if (productType === 'petRoll') {
        currentThickness = '9';   // 애견 롤매트 기본: 9T

      }
    }

    // 구매 링크 업데이트 및 표시 여부 결정
    $purchaseLink.href = product.link;

    // 경쟁사 제품인지 확인 (제거됨)
    // 경쟁사 비교 섹션 표시 및 업데이트 (제거됨)

    // 두께 선택 UI 업데이트
    updateThicknessSelector();

    // 기존 공간들의 매트 타입 옵션 업데이트
    updateAllSpaceMatTypes();
  }



  // 제품 변경 시 자동 재계산
  function updateAllSpaceMatTypes() {
    // 자동 재계산
    calculate();
  }

  // ========== 계산 모드 관리 ==========
  function getCalcMode() {
    if (currentProduct === 'puzzle') {
      return 'auto';
    }
    const hiddenInput = document.getElementById('calc-mode-value');
    return hiddenInput ? hiddenInput.value : 'loose';
  }

  // getModeLabel은 utils.js로 이동됨

  function updateCalcModeState(mode) {
    const hiddenInput = document.getElementById('calc-mode-value');
    if (hiddenInput) {
      hiddenInput.value = mode;
    }
    calcModeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // ========== 헬퍼 함수 래퍼 ==========
  // calculations.js의 함수들이 파라미터를 받는데, app.js는 전역 변수를 사용하므로
  // 전역 변수를 파라미터로 전달하는 wrapper 함수들

  function getThicknessLabel() {
    return window.getThicknessLabel(currentThickness);
  }

  function getCurrentPrice() {
    return window.getCurrentPrice(currentProduct, currentThickness);
  }

  // ========== 메인 계산 함수 ==========
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

    // 단순공간 처리
    spaces.forEach((space) => {
      const result = window.calculateSpace(
        space.getName(),
        space.getW(),
        space.getH(),
        space.getType(),
        calcMode,
        space, // space 객체 전체 전달
        currentProduct,
        currentThickness
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

        // 각 공간을 감싸는 컨테이너 시작
        totalCompositionHTML += `<div class="space-composition-item" style="display: flex; gap: 1.5rem; align-items: flex-start; margin-bottom: ${idx < spaceResults.length - 1 ? '24px' : '0'}; padding-bottom: ${idx < spaceResults.length - 1 ? '24px' : '0'}; border-bottom: ${idx < spaceResults.length - 1 ? '2px solid #e2e8f0' : 'none'};">`;
        
        // 텍스트 정보 영역
        totalCompositionHTML += `<div class="space-composition-text" style="flex: 1; min-width: 0;">`;
        totalCompositionHTML += `<div style="margin-bottom: 12px;">
          <strong>${spaceName}</strong>
          <span class="muted small">(${r.width}cm × ${r.height}cm)</span>
        </div>`;

        if (r.breakdown && r.breakdown.length > 0) {
          r.breakdown.forEach(line => {
            // 배송메모는 구분선으로 분리
            if (line.includes('배송메모')) {
              totalCompositionHTML += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;"></div>`;
              totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 8px; font-weight: 500;">${line}</div>`;
            } else {
              totalCompositionHTML += `<div style="margin-left: 15px; margin-bottom: 6px;">${line}</div>`;
            }
          });
        }

        if (Number.isFinite(r.coverageWidth) && Number.isFinite(r.coverageHeight)) {
          totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 10px; color: #64748b; font-size: 12px;">매트의 크기는 총 ${r.coverageWidth}cm × ${r.coverageHeight}cm 입니다.</div>`;
        }
        // 재단/여유 안내 메시지 표시 (변환된 메시지 사용)
        const convertedMessages = convertFitMessagesForEstimate(r.fitMessages);
        if (convertedMessages.length > 0) {
          totalCompositionHTML += `<div style="margin-top: 6px;"></div>`;
          convertedMessages.forEach(msg => {
            totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 4px; color: #64748b; font-size: 12px;">${msg}</div>`;
          });
        }
        totalCompositionHTML += `</div>`; // space-composition-text 닫기

        // 시각화 영역 placeholder
        totalCompositionHTML += `<div class="space-visual-placeholder" data-space-index="${r.index}" style="flex: 0 0 auto; width: 600px; height: 600px;"></div>`;
        
        totalCompositionHTML += `</div>`; // space-composition-item 닫기
      });

      // 온도 변화 안내 메시지 표시 (제품 설정에서 확인)
      let showThermalNotice = false;
      if (typeof getProductConfig === 'function') {
        const config = getProductConfig(currentProduct);
        showThermalNotice = config && config.showThermalNotice;
      } else {
        // 폴백: 롤매트 제품들은 온도 안내 표시
        showThermalNotice = ['babyRoll', 'petRoll'].includes(currentProduct);
      }

      if (showThermalNotice) {
        totalCompositionHTML += `<div style="margin-top: 12px; color: #94a3b8; font-size: 12px;">온도 변화에 따른 수축을 고려해, 폭·길이 모두 여유 있게 출고됩니다.</div>`;
      }

      // 견적 참고용 안내 문구 추가 (모든 제품)
      totalCompositionHTML += `<div style="margin-top: 12px; padding: 10px; background-color: #f8fafc; border-radius: 6px; color: #64748b; font-size: 13px; line-height: 1.5;">
        <i class="fas fa-info-circle" style="margin-right: 6px; color: #94a3b8;"></i>
        본 견적은 참고용이며, 실제 시공 환경에 따라 달라질 수 있습니다.
      </div>`;
    } else {
      totalCompositionHTML = '-';
    }
    $totalComposition.innerHTML = totalCompositionHTML;

    // 각 placeholder를 실제 시각화로 교체
    spaceResults.forEach((r) => {
      const placeholder = $totalComposition.querySelector(`.space-visual-placeholder[data-space-index="${r.index}"]`);
      if (placeholder) {
        const visualWrapper = document.createElement('div');
        visualWrapper.className = 'space-visual-wrapper';
        visualWrapper.innerHTML = `<div class="space-visual" data-space-visual-id="${r.index}"></div>`;
        placeholder.parentNode.replaceChild(visualWrapper, placeholder);
      }
    });

    renderSpaceVisualizations(spaceResults);

    let totalSummaryHTML = '-';
    if (activeSpaces > 0) {
      let quantityText = '';
      if (currentProduct === 'puzzle') {
        const parts = [];
        if (total100 > 0) parts.push(`100×100cm 1pcs: ${total100}장`);
        if (total50 > 0) parts.push(`50×50cm 4pcs: ${total50}장`);
        quantityText = parts.join(' / ');
      } else {
        // 롤매트 제품들 - 50cm 개수 표시 여부 확인
        let showRollUnits = false;
        if (typeof getProductConfig === 'function') {
          const config = getProductConfig(currentProduct);
          showRollUnits = config && config.showRollUnits;
        } else {
          // 폴백: petRoll만 50cm 개수 표시
          showRollUnits = (currentProduct === 'petRoll');
        }

        if (showRollUnits) {
          quantityText = totalRolls > 0 ?
            `${totalRolls}롤 (50cm ${totalRollUnits}개)` :
            '0롤';
        } else {
          quantityText = totalRolls > 0 ? `${totalRolls}롤` : '0롤';
        }
      }
      const priceText = KRW.format(totalPrice);
      totalSummaryHTML = `${quantityText}<br><span style="color: #d4a574; font-weight: 600;">${priceText}</span> <span class="muted small">(할인 미적용가)</span>`;
    }
    $totalSummary.innerHTML = totalSummaryHTML;
  }


  // 견적서용 메시지 변환 함수
  function convertFitMessagesForEstimate(fitMessages) {
    if (!fitMessages || !Array.isArray(fitMessages)) {
      return [];
    }

    const convertedMessages = [];
    let hasTrimMessage = false;
    let hasGapMessage = false;

    fitMessages.forEach(msg => {
      if (typeof msg === 'string' && !msg.includes('경고') && !msg.includes('경계선')) {
        if (msg.includes('재단이 필요합니다')) {
          hasTrimMessage = true;
        } else if (msg.includes('매트가 부족합니다')) {
          hasGapMessage = true;
        } else {
          // 다른 메시지들은 그대로 유지
          convertedMessages.push(msg);
        }
      }
    });

    // 변환된 메시지 추가 (한 번만)
    if (hasTrimMessage) {
      convertedMessages.push('약간의 재단으로 여백 없이 설치 가능합니다.');
    }
    if (hasGapMessage) {
      convertedMessages.push('재단 없이 설치 가능합니다.');
    }

    return convertedMessages;
  }

  function buildSpaceQuickSummary(result, idx) {
    const spaceName = result.name || `공간 ${idx + 1}`;
    const width = Number.isFinite(result.width) ? result.width : null;
    const height = Number.isFinite(result.height) ? result.height : null;
    const summary = {
      name: spaceName,
      dimensions: width !== null && height !== null ? `${width}cm × ${height}cm` : null,
      lines: []
    };

    if (result.breakdown && Array.isArray(result.breakdown) && result.breakdown.length > 0) {
      // 빈 줄 추가 (조각 헤더와 breakdown 사이)
      summary.lines.push('');

      // breakdown 정보 추가
      result.breakdown.forEach(line => {
        if (typeof line === 'string') {
          if (line.includes('배송메모')) {
            if (summary.lines.length > 0 && summary.lines[summary.lines.length - 1] !== '') {
              summary.lines.push('');
            }
            summary.lines.push(line);
          } else {
            summary.lines.push(line);
          }
        }
      });

      // 매트 크기 정보
      if (Number.isFinite(result.coverageWidth) && Number.isFinite(result.coverageHeight)) {
        summary.lines.push(`매트의 크기는 총 ${result.coverageWidth}cm × ${result.coverageHeight}cm 입니다.`);
      }

      // 재단/여유 안내 (견적서용으로 변환)
      const convertedMessages = convertFitMessagesForEstimate(result.fitMessages);
      convertedMessages.forEach(msg => {
        summary.lines.push(msg);
      });
    }

    // breakdown이 없을 때도 기본 정보 추가
    if (summary.lines.length === 0) {
      if (result.type) {
        summary.lines.push(result.type);
      } else if (result.spaceType === 'roll' || result.spaceType === 'petRoll') {
        summary.lines.push(`롤매트 - ${getThicknessLabel()}`);
      } else if (result.spaceType === 'hybrid') {
        summary.lines.push(`복합 매트 - ${getThicknessLabel()}`);
      } else {
        summary.lines.push('견적 정보 없음');
      }
    }

    return summary;
  }

  // 견적 텍스트 생성 함수
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

    let text = '<견적 산출 결과>\n\n';

    text += '[견적내용]\n';
    spaceResults.forEach((result, idx) => {
      const summary = buildSpaceQuickSummary(result, idx);
      const header = summary.dimensions ? `${summary.name} (${summary.dimensions})` : summary.name;

      if (idx === 0) {
        text += `${header}\n`;
      } else {
        text += `\n────────────────────\n${header}\n`;
      }

      if (summary.lines.length > 0) {
        let previousWasBlank = false;
        summary.lines.forEach(line => {
          const content = typeof line === 'string' ? line.trimEnd() : line;
          const isBlank = !content;

          if (isBlank) {
            if (!previousWasBlank) {
              text += '\n';
              previousWasBlank = true;
            }
            return;
          }

          if (typeof content === 'string' && (content.startsWith('>') || content.startsWith('►'))) {
            text += `${content}\n`;
          } else {
            text += `  ${content}\n`;
          }
          previousWasBlank = false;
        });
      } else {
        text += '  상세 정보 없음\n';
      }
    });

    text = text.replace(/\n+$/, '\n\n');
    text += '[수량 및 가격]\n';
    if (currentProduct === 'puzzle') {
      const parts = [];
      if (total100 > 0) parts.push(`100×100cm 1pcs: ${total100}장`);
      if (total50 > 0) parts.push(`50×50cm 4pcs: ${total50}장`);
      text += `수량 : ${parts.join(' / ')}\n`;
    } else {
      // 롤매트 제품들 - 50cm 개수 표시 여부 확인
      let showRollUnits = false;
      if (typeof getProductConfig === 'function') {
        const config = getProductConfig(currentProduct);
        showRollUnits = config && config.showRollUnits;
      } else {
        // 폴백: petRoll만 50cm 개수 표시
        showRollUnits = (currentProduct === 'petRoll');
      }

      if (showRollUnits) {
        text += `수량 : ${totalRolls}롤 (50cm ${totalRollUnits}개)\n`;
      } else {
        text += `수량 : ${totalRolls}롤\n`;
      }
    }
    text += `가격 : ${KRW.format(totalPrice)} (할인 미적용가)\n`;

    text = text.replace(/\n+$/, '\n\n');
    text += '[유의사항]\n';

    // 온도 변화 안내 메시지 표시 (제품 설정에서 확인)
    let showThermalNotice = false;
    if (typeof getProductConfig === 'function') {
      const config = getProductConfig(currentProduct);
      showThermalNotice = config && config.showThermalNotice;
    } else {
      // 폴백: 롤매트 제품들은 온도 안내 표시
      showThermalNotice = ['babyRoll', 'petRoll'].includes(currentProduct);
    }

    if (showThermalNotice) {
      text += '온도 변화에 따른 수축을 고려해, 폭·길이 모두 여유 있게 출고됩니다.\n';
    }

    text += '본 견적은 참고용이며, 실제 시공 환경에 따라 달라질 수 있습니다.\n';

    return text;
  }

  // 복합공간 시각화 렌더링 함수 제거됨

  function renderSpaceVisualizations(spaceResults) {
    if (!Array.isArray(spaceResults) || spaceResults.length === 0) return;

    spaceResults.forEach((result, idx) => {
      const container = document.querySelector(`[data-space-visual-id="${result.index}"]`);
      if (!container) return;

      const vis = result.visualization;
      if (!vis) {
        container.style.display = 'none';
        return;
      }

      // 복합공간 시각화 제거됨

      const spaceWidth = Math.max(vis.space.width, 1);
      const spaceHeight = Math.max(vis.space.height, 1);
      const coverageWidth = Math.max(vis.coverage.width, 1);
      const coverageHeight = Math.max(vis.coverage.height, 1);
      const baseWidth = Math.max(spaceWidth, coverageWidth);
      const baseHeight = Math.max(spaceHeight, coverageHeight);

      const padding = Math.max(baseWidth, baseHeight) * 0.15;
      const viewBoxWidth = baseWidth + padding * 2;
      const viewBoxHeight = baseHeight + padding * 2;

      container.innerHTML = '';
      container.style.display = 'block';
      container.style.aspectRatio = `${viewBoxWidth / viewBoxHeight}`;

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

      const spaceRect = document.createElementNS(SVG_NS, 'rect');
      spaceRect.setAttribute('x', 0);
      spaceRect.setAttribute('y', 0);
      spaceRect.setAttribute('width', spaceWidth);
      spaceRect.setAttribute('height', spaceHeight);
      spaceRect.setAttribute('fill', 'rgba(226, 232, 240, 0.35)');
      spaceRect.setAttribute('stroke', '#94a3b8');
      spaceRect.setAttribute('stroke-width', 0.8);
      spaceRect.setAttribute('stroke-dasharray', '4 3');
      svg.appendChild(spaceRect);

      const coverageRect = document.createElementNS(SVG_NS, 'rect');
      coverageRect.setAttribute('x', 0);
      coverageRect.setAttribute('y', 0);
      coverageRect.setAttribute('width', coverageWidth);
      coverageRect.setAttribute('height', coverageHeight);
      coverageRect.setAttribute('fill', 'rgba(255, 255, 240, 0.14)');
      coverageRect.setAttribute('stroke', '#333333');
      coverageRect.setAttribute('stroke-width', 1.2);
      svg.appendChild(coverageRect);

      if (vis.type === 'puzzle' && Array.isArray(vis.tiles)) {
        vis.tiles.forEach((tile, tileIdx) => {
          const tileRect = document.createElementNS(SVG_NS, 'rect');
          tileRect.setAttribute('class', 'tile');
          tileRect.setAttribute('x', tile.x);
          tileRect.setAttribute('y', tile.y);
          tileRect.setAttribute('width', tile.width);
          tileRect.setAttribute('height', tile.height);
          if (tile.size === 100) {
            tileRect.setAttribute('fill', 'rgba(255, 255, 240, 0.6)');
            tileRect.setAttribute('stroke', '#333333');
            tileRect.setAttribute('stroke-width', 1.2);
          } else {
            tileRect.setAttribute('fill', tileIdx % 2 === 0 ? 'rgba(255, 255, 240, 0.7)' : 'rgba(255, 255, 245, 0.75)');
            tileRect.setAttribute('stroke', '#333333');
            tileRect.setAttribute('stroke-width', 0.6);
          }
          svg.appendChild(tileRect);
          if (tile.width >= 30 && tile.height >= 30) {
            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('class', 'tile');
            label.setAttribute('x', tile.x + tile.width / 2);
            label.setAttribute('y', tile.y + tile.height / 2);
            label.setAttribute('font-size', Math.min(tile.width, tile.height) * 0.1);
            label.setAttribute('fill', '#5a4a3a');
            label.setAttribute('font-weight', '600');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.textContent = `${tile.width}×${tile.height}cm`;
            svg.appendChild(label);
          }
        });
      } else if (vis.type === 'roll' && Array.isArray(vis.stripes)) {
        const colors = ['rgba(255, 255, 240, 0.55)', 'rgba(255, 255, 245, 0.65)', 'rgba(255, 255, 250, 0.7)'];
        vis.stripes.forEach((strip, stripIdx) => {
          const stripRect = document.createElementNS(SVG_NS, 'rect');
          stripRect.setAttribute('class', 'stripe');
          stripRect.setAttribute('x', strip.x);
          stripRect.setAttribute('y', strip.y);
          stripRect.setAttribute('width', strip.width);
          stripRect.setAttribute('height', strip.height);
          stripRect.setAttribute('fill', colors[stripIdx % colors.length]);
          stripRect.setAttribute('stroke', '#333333');
          stripRect.setAttribute('stroke-width', 0.8);
          svg.appendChild(stripRect);
          const minDimension = Math.min(strip.width, strip.height);
          if (minDimension >= 20) {
            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('class', 'stripe');
            label.setAttribute('x', strip.x + strip.width / 2);
            label.setAttribute('y', strip.y + strip.height / 2);
            label.setAttribute('font-size', minDimension * 0.1);
            label.setAttribute('fill', '#5a4a3a');
            label.setAttribute('font-weight', '600');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.textContent = `${strip.width}×${strip.height}cm`;
            svg.appendChild(label);
          }
        });
      }

      const fontSize = Math.max(3, Math.max(baseWidth, baseHeight) * 0.015);
      const labelOffset = fontSize * 0.3;
      for (let x = 0; x <= baseWidth; x += gridMajor) {
        if (x === 0) continue;
        const labelText = document.createElementNS(SVG_NS, 'text');
        labelText.setAttribute('x', x);
        labelText.setAttribute('y', -labelOffset);
        labelText.setAttribute('font-size', fontSize);
        labelText.setAttribute('fill', '#64748b');
        labelText.setAttribute('text-anchor', 'middle');
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

      const summary = buildSpaceQuickSummary(result, idx);

      // 좌표 회전 버튼 (단순 공간)
      const rotateBtn = document.createElement('button');
      rotateBtn.className = 'rotate-coords-btn';
      rotateBtn.title = '좌표 회전 (가로/세로 교체)';
      rotateBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    `;
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // spaces 배열에서 해당 공간 찾기
        const space = spaces.find(s => s.id === result.index);
        if (space && space.element) {
          const wInput = space.element.querySelector('.space-w');
          const hInput = space.element.querySelector('.space-h');
          if (wInput && hInput) {
            const temp = wInput.value;
            wInput.value = hInput.value;
            hInput.value = temp;
            calculate();
          }
        }
      });
      container.appendChild(rotateBtn);

      // 매트 표시/숨기기 토글 버튼 (persistent state)
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-mat-btn';
      toggleBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;

      // 컨테이너에 상태 저장 (초기값 설정)
      if (!('matsVisible' in container.dataset)) {
        container.dataset.matsVisible = 'true';
      }
      const matsVisible = container.dataset.matsVisible === 'true';

      // 초기 상태 적용
      const matElements = svg.querySelectorAll('.tile, .stripe');
      matElements.forEach(tile => {
        tile.style.opacity = matsVisible ? '' : '0';
      });
      toggleBtn.style.opacity = matsVisible ? '' : '0.5';
      toggleBtn.title = matsVisible ? '매트 표시/숨기기' : '매트 숨김 (클릭하여 표시)';

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentState = container.dataset.matsVisible === 'true';
        const newState = !currentState;
        container.dataset.matsVisible = newState;

        const matElements = svg.querySelectorAll('.tile, .stripe');
        matElements.forEach(tile => {
          tile.style.opacity = newState ? '' : '0';
        });
        toggleBtn.style.opacity = newState ? '' : '0.5';
        toggleBtn.title = newState ? '매트 표시/숨기기' : '매트 숨김 (클릭하여 표시)';
      });
      container.appendChild(toggleBtn);

      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'download-canvas-btn';
      downloadBtn.title = '이미지 다운로드';
      downloadBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        `;
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSpaceVisualization(container, summary.name);
      });
      container.appendChild(downloadBtn);
    });
  }
  function downloadSpaceVisualization(container, spaceName) {
    // html2canvas로 전체 컨테이너를 이미지로 변환
    html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2, // 고해상도
      logging: false,
      useCORS: true
    }).then(canvas => {
      // PNG로 변환하여 다운로드
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${spaceName}_견적.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    });
  }

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
        견적 복사
          `;
    $copyEstimate.style.background = '';
    $copyEstimate.style.borderColor = '';
    $copyEstimate.style.color = '';
  }

  // 견적 복사 함수
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

  // 계산 방식 탭 초기화 (제거됨 - 퍼즐매트는 항상 최적조합 방식 사용)
  function initCalcModeTabs() {
    // 계산 방식 섹션이 제거되어 더 이상 필요 없음
  }

  // ========== 단순공간 관리 ==========
  // 공간 추가 함수 (단순 버전 - 조각 추가 기능 제거됨)
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
            <label class="space-name-label" style="${spaces.length > 0 ? 'display: flex;' : 'display: none;'}">
              <span>공간 이름</span>
              <input type="text" class="space-name" placeholder="예: 거실" value="" />
            </label>
            <div style="margin-bottom: 12px;">
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
            </div>
            `;

    $spacesContainer.appendChild(spaceDiv);

    // 삭제 버튼 이벤트
    const removeBtn = spaceDiv.querySelector('.remove-space');
    removeBtn.addEventListener('click', () => removeSpace(id));

    // 입력 변경 시 자동 계산
    const inputs = spaceDiv.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.classList.contains('space-w') || input.classList.contains('space-h')) {
        input.addEventListener('input', () => {
          let val = parseInt(input.value);
          // 최대값 제한 제거
          /*
          if (!isNaN(val) && val > 1500) {
            input.value = 1500;
          }
          */
          calculate();
        });

        input.addEventListener('change', () => {
          let val = parseInt(input.value);
          if (isNaN(val)) val = 0;
          val = Math.max(0, val); // 최대값 제한 제거
          input.value = val;
          calculate();
        });
      } else {
        ['input', 'change'].forEach(evt => {
          input.addEventListener(evt, calculate);
        });
      }
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
        if (['riposoRoll', 'parklonRoll', 'tgoRoll'].includes(currentProduct)) return 'roll';
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

  // 제품 탭 초기화
  function initProductTabs() {
    const tabButtons = document.querySelectorAll('.product-tab-btn');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        // 모든 제품 탭에서 active와 parent-active 클래스 제거 (메인 제품 + 경쟁사)
        document.querySelectorAll('.product-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.classList.remove('parent-active');
        });

        // 클릭된 탭에 active 클래스 추가
        btn.classList.add('active');

        // 제품 정보 업데이트
        const productType = btn.dataset.product;
        updateProductDisplay(productType);
      });
    });
  }

  // clampNonNegInt helper
  function clampNonNegInt(val) {
    const num = parseInt(val);
    return isNaN(num) || num < 0 ? 0 : num;
  }

  // 이벤트 리스너 등록
  $addSpace.addEventListener('click', addSpace);
  $copyEstimate.addEventListener('click', copyEstimate);

  // 제품 탭 초기화
  initProductTabs();

  // 계산 방식 탭 초기화
  initCalcModeTabs();

  // 초기 제품 정보 로드
  updateProductDisplay('babyRoll');

  // 초기 공간 1개 추가
  addSpace();
})();
