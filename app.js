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

  // ========== 제품 정보 ==========
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


  // ========== UI 관리 함수 ==========
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

    // 계산 방식 섹션 제거됨 (퍼즐매트는 항상 최적조합 방식 사용)

    // 기존 공간들의 매트 타입 옵션 업데이트
    updateAllSpaceMatTypes();
    
    // 복합 공간 컨트롤 표시/숨김 업데이트
    updateComplexSpaceControls();
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

    // 복잡한 공간 모드인 경우
    if (currentSpaceMode === 'complex') {
      if (complexSpacePieces.length > 0) {
        // 현재 제품에 따른 타입 결정
        let productType = 'hybrid'; // 퍼즐매트 기본값
        if (currentProduct === 'babyRoll') {
          productType = 'roll';
        } else if (currentProduct === 'petRoll') {
          productType = 'petRoll';
        }

        // 복잡한 공간 계산 (calculations.js의 전역 함수 사용)
        const result = window.calculateComplexSpace(
          '복잡한 공간',
          complexSpacePieces.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, name: p.name, index: p.index })),
          productType,
          calcMode,
          currentProduct,
          currentThickness
        );

        if (result) {
          spaceResults.push({ index: 0, ...result });
          totalPrice += result.price;
          activeSpaces = 1;

          if (result.total50) total50 += result.total50;
          if (result.total100) total100 += result.total100;

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
      }
    } else {
      // 단순 공간 모드 (기존 로직)
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
    }

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

        // 복합 공간인 경우 조각별로 그룹화하여 표시
        if (r.pieceDetails && r.pieceDetails.length > 0 && r.breakdown) {
          // 복합 공간은 크기 표시 안함
          totalCompositionHTML += `<div style="margin-bottom: 12px;">
            <strong>${spaceName}</strong>
          </div>`;

          // breakdown을 조각별로 분류
          const pieceBreakdowns = {};
          r.breakdown.forEach(line => {
            const match = line.match(/^\[(.+?)\]\s*(.+)$/);
            if (match) {
              const pieceName = match[1];
              const content = match[2];
              if (!pieceBreakdowns[pieceName]) {
                pieceBreakdowns[pieceName] = [];
              }
              pieceBreakdowns[pieceName].push(content);
            }
          });

          // 조각별로 출력
          r.pieceDetails.forEach(piece => {
            const pieceName = piece.name;

            // 조각 이름 헤더 (한 번만, 조각 크기 포함)
            totalCompositionHTML += `<div style="margin-left: 15px; margin-top: 8px; margin-bottom: 4px; font-weight: 500;">${pieceName} <span class="muted small" style="font-weight: 400;">(${piece.width}cm × ${piece.height}cm)</span></div>`;

            // breakdown 출력
            if (pieceBreakdowns[pieceName]) {
              pieceBreakdowns[pieceName].forEach(line => {
                totalCompositionHTML += `<div style="margin-left: 30px; margin-bottom: 4px;">${line}</div>`;
              });
            }

            // 매트 크기 정보
            if (Number.isFinite(piece.coverageWidth) && Number.isFinite(piece.coverageHeight)) {
              totalCompositionHTML += `<div style="margin-left: 30px; margin-top: 4px; color: #64748b; font-size: 12px;">매트의 크기는 총 ${piece.coverageWidth}cm × ${piece.coverageHeight}cm 입니다.</div>`;
            }

            // 재단/여유 안내 (변환된 메시지 사용)
            const convertedPieceMessages = convertFitMessagesForEstimate(piece.fitMessages);
            convertedPieceMessages.forEach(msg => {
              totalCompositionHTML += `<div style="margin-left: 30px; margin-top: 4px; color: #64748b; font-size: 12px;">${msg}</div>`;
            });

            totalCompositionHTML += `<div style="margin-bottom: 8px;"></div>`;
          });
        } else {
          // 단순 공간인 경우 기존 방식 (크기 표시)
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
        }

        // 각 공간 뒤에 시각화 placeholder 추가
        totalCompositionHTML += `<div class="space-visual-placeholder" data-space-index="${r.index}"></div>`;

        if (idx < spaceResults.length - 1) {
          totalCompositionHTML += `<div style="margin: 18px 0; border-top: 2px solid #e2e8f0;"></div>`;
        }
      });
      if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
        totalCompositionHTML += `<div style="margin-top: 12px; color: #94a3b8; font-size: 12px;">온도 변화에 따른 수축을 고려해, 폭·길이 모두 여유 있게 출고됩니다.</div>`;
      }
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
      } else if (currentProduct === 'babyRoll') {
        quantityText = totalRolls > 0 ? `${totalRolls}롤` : '0롤';
      } else if (currentProduct === 'petRoll') {
        quantityText = totalRolls > 0 ?
          `${totalRolls}롤 (50cm ${totalRollUnits}개)` :
          '0롤';
      }
      const priceText = KRW.format(totalPrice);
      totalSummaryHTML = `${quantityText}<br><span style="color: #2563eb; font-weight: 600;">${priceText}</span> <span class="muted small">(할인 미적용가)</span>`;
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

    if (result.pieceDetails && result.pieceDetails.length > 0 && result.breakdown && Array.isArray(result.breakdown)) {
      const pieceBreakdowns = {};
      result.breakdown.forEach(line => {
        const match = line.match(/^\[(.+?)\]\s*(.+)$/);
        if (match) {
          const [, pieceName, content] = match;
          if (!pieceBreakdowns[pieceName]) {
            pieceBreakdowns[pieceName] = [];
          }
          pieceBreakdowns[pieceName].push(content);
        }
      });

      result.pieceDetails.forEach((piece, pieceIdx) => {
        // 조각 헤더 (이름과 크기)
        summary.lines.push(`${piece.name} (${piece.width}cm × ${piece.height}cm)`);
        summary.lines.push(''); // 빈 줄

        // breakdown 정보
        const pieceLines = pieceBreakdowns[piece.name];
        if (pieceLines && pieceLines.length > 0) {
          pieceLines.forEach(content => {
            summary.lines.push(content);
          });
        }

        // 매트 크기 정보
        if (Number.isFinite(piece.coverageWidth) && Number.isFinite(piece.coverageHeight)) {
          summary.lines.push(`매트의 크기는 총 ${piece.coverageWidth}cm × ${piece.coverageHeight}cm 입니다.`);
        }

        // 재단/여유 안내 (견적서용으로 변환)
        const convertedPieceMessages = convertFitMessagesForEstimate(piece.fitMessages);
        convertedPieceMessages.forEach(msg => {
          summary.lines.push(msg);
        });

        // 조각 간 구분 빈 줄 (마지막 조각이 아닐 때만)
        if (pieceIdx < result.pieceDetails.length - 1) {
          summary.lines.push('');
          summary.lines.push(''); // 조각 사이 빈 줄 하나 더 추가
        }
      });
    } else if (result.breakdown && Array.isArray(result.breakdown) && result.breakdown.length > 0) {
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
    } else if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
      if (currentProduct === 'petRoll') {
        text += `수량 : ${totalRolls}롤 (50cm ${totalRollUnits}개)\n`;
      } else {
        text += `수량 : ${totalRolls}롤\n`;
      }
    }
    text += `가격 : ${KRW.format(totalPrice)} (할인 미적용가)\n`;

    text = text.replace(/\n+$/, '\n\n');
    text += '[유의사항]\n';
    if (currentProduct === 'babyRoll' || currentProduct === 'petRoll') {
      text += '온도 변화에 따른 수축을 고려해, 폭·길이 모두 여유 있게 출고됩니다.\n';
    }
    text += '견적은 참고용이므로 반드시 재확인 후 구매하시기 바랍니다.\n';

    text = text.replace(/\n+$/, '\n\n');
    return text;
  }

  // 복합 공간 시각화 렌더링
  function renderComplexSpaceVisualization(container, vis, result, spaceIdx) {
    const { pieces, space, coverage, tiles } = vis;
    const baseWidth = Math.max(space.width, 1);
    const baseHeight = Math.max(space.height, 1);

    const padding = Math.max(baseWidth, baseHeight) * 0.15;
    const viewBoxWidth = baseWidth + padding * 2;
    const viewBoxHeight = baseHeight + padding * 2;

    container.innerHTML = '';
    container.style.display = 'block';

    // 공간 비율에 맞게 컨테이너 aspect-ratio 설정
    const aspectRatio = viewBoxWidth / viewBoxHeight;
    container.style.aspectRatio = `${aspectRatio}`;

    const rect = container.getBoundingClientRect();
    const containerSize = rect.width || rect.height || container.clientWidth;
    if (!containerSize) {
      if (!container.dataset.deferScheduled) {
        container.dataset.deferScheduled = '1';
        requestAnimationFrame(() => {
          renderComplexSpaceVisualization(container, vis, result, spaceIdx);
        });
      }
      return;
    }
    delete container.dataset.deferScheduled;

    const scale = containerSize / Math.max(viewBoxWidth, viewBoxHeight);
    const gridMinor = vis.gridMinor || 10;
    const gridMajor = vis.gridMajor || 50;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `${-padding} ${-padding} ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('class', 'space-visual-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // 격자선
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

    // L자 공간 조각들을 점선으로 그림 (겹친 부분은 내부 경계선만 표시)
    if (pieces && pieces.length > 0) {
      // 조각별 색상 정의 (UI와 동일)
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

      // 전체 영역을 회색으로 표시
      const allPiecesGroup = document.createElementNS(SVG_NS, 'g');
      pieces.forEach((piece, idx) => {
        const pieceRect = document.createElementNS(SVG_NS, 'rect');
        pieceRect.setAttribute('x', piece.x);
        pieceRect.setAttribute('y', piece.y);
        pieceRect.setAttribute('width', piece.w);
        pieceRect.setAttribute('height', piece.h);
        pieceRect.setAttribute('fill', 'rgba(226, 232, 240, 0.35)');
        pieceRect.setAttribute('stroke', 'none');
        allPiecesGroup.appendChild(pieceRect);
      });
      svg.appendChild(allPiecesGroup);

      // 각 조각의 경계선을 점선으로 표시
      pieces.forEach((piece, idx) => {
        const pieceColorIndex = piece.index !== undefined ? piece.index : idx;
        const pieceColor = colors[pieceColorIndex % colors.length];
        // 각 변에 대해 다른 조각과 겹치는지 확인
        const edges = [
          { x1: piece.x, y1: piece.y, x2: piece.x + piece.w, y2: piece.y }, // 위
          { x1: piece.x + piece.w, y1: piece.y, x2: piece.x + piece.w, y2: piece.y + piece.h }, // 오른쪽
          { x1: piece.x, y1: piece.y + piece.h, x2: piece.x + piece.w, y2: piece.y + piece.h }, // 아래
          { x1: piece.x, y1: piece.y, x2: piece.x, y2: piece.y + piece.h } // 왼쪽
        ];

        edges.forEach(edge => {
          // 이 변이 다른 조각의 내부에 있는지 확인
          let isInternalEdge = false;
          pieces.forEach((otherPiece, otherIdx) => {
            if (idx === otherIdx) return;

            // 수평선인 경우
            if (edge.y1 === edge.y2) {
              const y = edge.y1;
              if (y > otherPiece.y && y < otherPiece.y + otherPiece.h) {
                // 선분이 다른 조각과 겹치는지 확인
                const overlapStart = Math.max(edge.x1, otherPiece.x);
                const overlapEnd = Math.min(edge.x2, otherPiece.x + otherPiece.w);
                if (overlapStart < overlapEnd) {
                  isInternalEdge = true;
                }
              }
            }
            // 수직선인 경우
            else if (edge.x1 === edge.x2) {
              const x = edge.x1;
              if (x > otherPiece.x && x < otherPiece.x + otherPiece.w) {
                const overlapStart = Math.max(edge.y1, otherPiece.y);
                const overlapEnd = Math.min(edge.y2, otherPiece.y + otherPiece.h);
                if (overlapStart < overlapEnd) {
                  isInternalEdge = true;
                }
              }
            }
          });

          // 경계선 그리기 (조각 색상 사용)
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', edge.x1);
          line.setAttribute('y1', edge.y1);
          line.setAttribute('x2', edge.x2);
          line.setAttribute('y2', edge.y2);
          line.setAttribute('stroke', isInternalEdge ? '#64748b' : pieceColor);
          line.setAttribute('stroke-width', isInternalEdge ? 1.2 : 2.5);
          line.setAttribute('stroke-dasharray', isInternalEdge ? '4 2' : '8 4');
          line.setAttribute('opacity', isInternalEdge ? 0.7 : 1.0);
          svg.appendChild(line);
        });
      });
    }

    // 매트 타일 그리기
    if (tiles && tiles.length > 0) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

      tiles.forEach((tile, idx) => {
        const tileRect = document.createElementNS(SVG_NS, 'rect');
        tileRect.setAttribute('x', tile.x);
        tileRect.setAttribute('y', tile.y);
        tileRect.setAttribute('width', tile.width);
        tileRect.setAttribute('height', tile.height);

        // 타일이 속한 조각의 색상 결정 (조각 인덱스 우선 사용)
        const pieceIndex = tile.pieceIndex !== undefined ? tile.pieceIndex : 0;
        const tileColor = colors[pieceIndex % colors.length];
        const rgb = tileColor.match(/\w\w/g).map(x => parseInt(x, 16));

        // 타일 타입에 따라 다른 스타일 적용
        if (tile.size === 100) {
          // 100cm 퍼즐매트
          tileRect.setAttribute('fill', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`);
          tileRect.setAttribute('stroke', tileColor);
          tileRect.setAttribute('stroke-width', 1.2);
        } else if (tile.size === 50) {
          // 50cm 퍼즐매트
          tileRect.setAttribute('fill', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`);
          tileRect.setAttribute('stroke', tileColor);
          tileRect.setAttribute('stroke-width', 0.6);
        } else {
          // 롤매트 또는 기타
          tileRect.setAttribute('fill', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)`);
          tileRect.setAttribute('stroke', tileColor);
          tileRect.setAttribute('stroke-width', 0.8);
        }

        svg.appendChild(tileRect);

        // 타일 레이블
        if (tile.width >= 30 && tile.height >= 30) {
          const label = document.createElementNS(SVG_NS, 'text');
          label.setAttribute('x', tile.x + tile.width / 2);
          label.setAttribute('y', tile.y + tile.height / 2);
          label.setAttribute('font-size', Math.min(tile.width, tile.height) * 0.1);
          label.setAttribute('fill', '#ffffff');
          label.setAttribute('font-weight', '500');
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('dominant-baseline', 'middle');
          // 가로x세로 크기만 표시
          label.textContent = `${tile.width}×${tile.height}cm`;
          svg.appendChild(label);
        }
      });
    }

    // 격자 레이블
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

    const summary = buildSpaceQuickSummary(result, spaceIdx || 0);

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
  }

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

      if (vis.type === 'complex') {
        renderComplexSpaceVisualization(container, vis, result, idx);
        return;
      }

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
        vis.tiles.forEach((tile, tileIdx) => {
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
            tileRect.setAttribute('fill', tileIdx % 2 === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(96, 165, 250, 0.55)');
            tileRect.setAttribute('stroke', '#1d4ed8');
            tileRect.setAttribute('stroke-width', 0.6);
          }
          svg.appendChild(tileRect);
          if (tile.width >= 30 && tile.height >= 30) {
            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('x', tile.x + tile.width / 2);
            label.setAttribute('y', tile.y + tile.height / 2);
            label.setAttribute('font-size', Math.min(tile.width, tile.height) * 0.1);
            label.setAttribute('fill', '#ffffff');
            label.setAttribute('font-weight', '500');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'middle');
            label.textContent = `${tile.width}×${tile.height}cm`;
            svg.appendChild(label);
          }
        });
      } else if (vis.type === 'roll' && Array.isArray(vis.stripes)) {
        const colors = ['rgba(59, 130, 246, 0.55)', 'rgba(37, 99, 235, 0.55)', 'rgba(96, 165, 250, 0.55)'];
        vis.stripes.forEach((strip, stripIdx) => {
          const stripRect = document.createElementNS(SVG_NS, 'rect');
          stripRect.setAttribute('x', strip.x);
          stripRect.setAttribute('y', strip.y);
          stripRect.setAttribute('width', strip.width);
          stripRect.setAttribute('height', strip.height);
          stripRect.setAttribute('fill', colors[stripIdx % colors.length]);
          stripRect.setAttribute('stroke', '#1d4ed8');
          stripRect.setAttribute('stroke-width', 0.8);
          svg.appendChild(stripRect);
          const minDimension = Math.min(strip.width, strip.height);
          if (minDimension >= 20) {
            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('x', strip.x + strip.width / 2);
            label.setAttribute('y', strip.y + strip.height / 2);
            label.setAttribute('font-size', minDimension * 0.1);
            label.setAttribute('fill', '#ffffff');
            label.setAttribute('font-weight', '500');
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

  // ========== 복잡한 공간 관리 ==========
  const $spaceModeSimple = document.getElementById('space-mode-simple');
  const $spaceModeComplex = document.getElementById('space-mode-complex');
  const $simpleSpaceSection = document.getElementById('simple-space-section');
  const $complexSpaceSection = document.getElementById('complex-space-section');
  const $addPiece = document.getElementById('add-piece');
  const $piecesContainer = document.getElementById('pieces-container');
  // const $complexPreviewCanvas = document.getElementById('complex-preview-canvas'); // 미리보기 제거됨

  let currentSpaceMode = 'simple'; // 'simple' | 'complex'
  let complexSpacePieces = []; // 복잡한 공간의 조각들
  let pieceIdCounter = 0;

  // 공간 모드 전환 핸들러
  function handleSpaceModeChange(mode) {
    currentSpaceMode = mode;

    if (mode === 'simple') {
      $simpleSpaceSection.style.display = 'block';
      $complexSpaceSection.style.display = 'none';
    } else {
      $simpleSpaceSection.style.display = 'none';
      $complexSpaceSection.style.display = 'block';

      // 복잡한 공간 모드로 전환 시 초기화
      if (complexSpacePieces.length === 0) {
        addPieceToComplex(); // 첫 번째 조각 자동 추가
      }
    }

    calculate();
  }

  // 공간 모드 라디오 버튼 이벤트 리스너
  $spaceModeSimple.addEventListener('change', () => {
    if ($spaceModeSimple.checked) {
      handleSpaceModeChange('simple');
    }
  });

  $spaceModeComplex.addEventListener('change', () => {
    if ($spaceModeComplex.checked) {
      handleSpaceModeChange('complex');
    }
  });

  // 조각 추가 (복잡한 공간)
  function addPieceToComplex() {
    const pieceId = pieceIdCounter++;
    const pieceIndex = complexSpacePieces.length;

    const piece = {
      id: pieceId,
      index: pieceIndex, // 색상 결정용 인덱스
      name: `조각 ${pieceIndex + 1}`,
      x: 0,
      y: 0,
      w: 300,
      h: 200
    };

    complexSpacePieces.push(piece);
    renderPieceUI(piece);
    updateComplexPreview();
  }

  // 조각 UI 렌더링
  function renderPieceUI(piece) {
    // 조각 색상 결정
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const pieceColor = colors[(piece.index || 0) % colors.length];

    const $pieceCard = document.createElement('div');
    $pieceCard.className = 'space-card';
    $pieceCard.id = `piece-${piece.id}`;
    $pieceCard.style.marginBottom = '12px';
    $pieceCard.style.padding = '16px';
    $pieceCard.style.border = `2px solid ${pieceColor}`;
    $pieceCard.style.borderRadius = '8px';
    $pieceCard.style.background = '#ffffff';
    $pieceCard.style.position = 'relative';

    $pieceCard.innerHTML = `
      <div style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 4px; background: ${pieceColor}; border: 1px solid rgba(0,0,0,0.1);"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-right: 30px;">
        <input type="text" value="${piece.name}" id="piece-name-${piece.id}"
               style="font-weight: 500; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; flex: 1; max-width: 180px;">
        <button class="icon-btn" id="remove-piece-${piece.id}" title="조각 삭제" style="position: absolute; top: 8px; right: 36px;">×</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #64748b;">가로 (cm)</label>
          <input type="number" id="piece-w-${piece.id}" value="${piece.w}" min="10"
                 style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #64748b;">세로 (cm)</label>
          <input type="number" id="piece-h-${piece.id}" value="${piece.h}" min="10"
                 style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
        </div>
      </div>

      <div style="margin-bottom: 0;">
        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #64748b;">위치 좌표 (cm)</label>
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <input type="number" id="piece-x-${piece.id}" value="${piece.x}"
                 style="width: 70px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
          <button class="mini-arrow-btn" data-piece="${piece.id}" data-axis="x" data-dir="-1" style="padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 16px; line-height: 1;">←</button>
          <button class="mini-arrow-btn" data-piece="${piece.id}" data-axis="x" data-dir="1" style="padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 16px; line-height: 1;">→</button>
          <input type="number" id="piece-y-${piece.id}" value="${piece.y}"
                 style="width: 70px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; margin-left: 4px;">
          <button class="mini-arrow-btn" data-piece="${piece.id}" data-axis="y" data-dir="-1" style="padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 16px; line-height: 1;">↑</button>
          <button class="mini-arrow-btn" data-piece="${piece.id}" data-axis="y" data-dir="1" style="padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 16px; line-height: 1;">↓</button>
        </div>
      </div>
    `;

    $piecesContainer.appendChild($pieceCard);

    // 이벤트 리스너 등록
    const $name = document.getElementById(`piece-name-${piece.id}`);
    const $w = document.getElementById(`piece-w-${piece.id}`);
    const $h = document.getElementById(`piece-h-${piece.id}`);

    $name.addEventListener('input', () => {
      piece.name = $name.value;
      updateComplexPreview();
    });

    $w.addEventListener('input', () => {
      piece.w = clampNonNegInt($w.value);
      updateComplexPreview();
      calculate();
    });

    $h.addEventListener('input', () => {
      piece.h = clampNonNegInt($h.value);
      updateComplexPreview();
      calculate();
    });

    const $x = document.getElementById(`piece-x-${piece.id}`);
    const $y = document.getElementById(`piece-y-${piece.id}`);
    const $removeBtn = document.getElementById(`remove-piece-${piece.id}`);

    $x.addEventListener('input', () => {
      piece.x = parseInt($x.value) || 0;
      updateComplexPreview();
      calculate();
    });

    $y.addEventListener('input', () => {
      piece.y = parseInt($y.value) || 0;
      updateComplexPreview();
      calculate();
    });

    $removeBtn.addEventListener('click', () => {
      removePieceFromComplex(piece.id);
    });

    // 미니 화살표 버튼 이벤트 리스너
    $pieceCard.querySelectorAll('.mini-arrow-btn').forEach($btn => {
      $btn.addEventListener('click', () => {
        const pieceId = parseInt($btn.dataset.piece);
        const axis = $btn.dataset.axis;
        const dir = parseInt($btn.dataset.dir);
        const step = 50; // 50cm 단위

        const piece = complexSpacePieces.find(p => p.id === pieceId);
        if (!piece) return;

        if (axis === 'x') {
          piece.x += dir * step;
          $x.value = piece.x;
        } else if (axis === 'y') {
          piece.y += dir * step;
          $y.value = piece.y;
        }

        updateComplexPreview();
        calculate();
      });
    });
  }


  // 조각 삭제
  function removePieceFromComplex(pieceId) {
    const index = complexSpacePieces.findIndex(p => p.id === pieceId);
    if (index > -1) {
      complexSpacePieces.splice(index, 1);
      const $pieceCard = document.getElementById(`piece-${pieceId}`);
      if ($pieceCard) $pieceCard.remove();
      updateComplexPreview();
      calculate();
    }
  }

  // 복잡한 공간 미리보기 업데이트 (SVG 시각화)
  function updateComplexPreview() {
    // 미리보기 캔버스 제거됨 - 아무 작업 안함
  }

  // 조각 추가 버튼 이벤트 리스너
  $addPiece.addEventListener('click', addPieceToComplex);

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
