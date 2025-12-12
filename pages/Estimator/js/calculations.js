// 계산 함수들
// 주의: 이 함수들은 전역 변수 currentThickness, currentProduct에 의존합니다.
// app.js에서 이 함수들을 호출할 때 적절한 파라미터를 전달해야 합니다.

// 현재 두께 라벨 가져오기
function getThicknessLabel(currentThickness) {
  if (currentThickness === '25plus') return '25T Plus+';
  return currentThickness + 'T';
}

// 현재 선택된 두께의 가격 가져오기
function getCurrentPrice(currentProduct, currentThickness) {
  if (currentProduct === 'puzzle') {
    return PUZZLE_PRICES[currentThickness] || PUZZLE_PRICES[25];
  }
  return null; // 롤매트는 별도 처리 (폭에 따라 가격이 다름)
}

// 롤매트 두께별 사용 가능한 폭 목록
function getAvailableRollWidths(currentThickness, currentProduct) {
  // product-config.js의 함수 사용 (있으면)
  if (typeof getAvailableWidths === 'function') {
    return getAvailableWidths(currentProduct, currentThickness);
  }

  // 폴백: 기존 로직
  const thickness = parseInt(currentThickness);
  return Object.keys(ROLL_PRICES[thickness] || {}).map(Number);
}

// 50cm 매트만 사용하는 계산 (4장 = 1세트)
function calculate50(width, height, mode, currentProduct, currentThickness) {
  const tile = 50;
  let nx, ny;

  if (mode === 'exact') {
    nx = ceilDiv(width, tile);
    ny = ceilDiv(height, tile);
  } else {
    nx = floorDiv(width, tile);
    ny = floorDiv(height, tile);
  }

  const totalTiles = nx * ny;
  const sets = ceilDiv(totalTiles, 4);
  const pricePerSet = getCurrentPrice(currentProduct, currentThickness);
  const price = sets * pricePerSet;
  const area = width * height;
  const usedArea = nx * tile * ny * tile;
  const wastePercent = area > 0 ? Math.round(((usedArea - area) / usedArea) * 100) : 0;
  const coverageWidth = nx * tile;
  const coverageHeight = ny * tile;

  return {
    type: `50cm 매트 (4pcs 세트) - ${getThicknessLabel(currentThickness)}`,
    nx,
    ny,
    totalTiles,
    sets,
    pcs: sets,
    price,
    wastePercent,
    breakdown: [`50cm 매트: ${sets}세트 (${totalTiles}개 타일)`],
    coverageWidth,
    coverageHeight,
    fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight)
  };
}

// 100cm 매트만 사용하는 계산
function calculate100(width, height, mode, currentProduct, currentThickness) {
  const tile = 100;
  let nx, ny;

  if (mode === 'exact') {
    nx = ceilDiv(width, tile);
    ny = ceilDiv(height, tile);
  } else {
    nx = floorDiv(width, tile);
    ny = floorDiv(height, tile);
  }

  const pcs = nx * ny;
  const pricePerPcs = getCurrentPrice(currentProduct, currentThickness);
  const price = pcs * pricePerPcs;
  const area = width * height;
  const usedArea = nx * tile * ny * tile;
  const wastePercent = area > 0 ? Math.round(((usedArea - area) / usedArea) * 100) : 0;
  const coverageWidth = nx * tile;
  const coverageHeight = ny * tile;

  return {
    type: `100cm 매트 (1pcs) - ${getThicknessLabel(currentThickness)}`,
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

function getPreferredRollAxis(width, height) {
  const width50 = width % 50 === 0;
  const height50 = height % 50 === 0;

  if (width50 && !height50) return 'height';
  if (!width50 && height50) return 'width';
  if (width <= height) return 'width';
  return 'height';
}

// 최적의 롤매트 폭 조합 찾기
function generateRollWidthCombinations(targetWidth, mode, currentThickness, currentProduct, { exactOverageCap = EXACT_OVERAGE_CAP_CM } = {}) {
  const thickness = parseInt(currentThickness);
  const availableWidths = getAvailableRollWidths(currentThickness, currentProduct);
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
            priority: getRollWidthPriority(width, thickness, currentProduct),
            sameWidth: true
          });

          break;
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
            priority: getRollWidthPriority(width, thickness, currentProduct),
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
            const avgPriority = (getRollWidthPriority(w1, thickness, currentProduct) + getRollWidthPriority(w2, thickness, currentProduct)) / 2;

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
            const avgPriority = (getRollWidthPriority(w1, thickness, currentProduct) + getRollWidthPriority(w2, thickness, currentProduct)) / 2;

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

// 롤매트 계산 함수
function calculateRollMat(width, height, mode, currentThickness, currentProduct, { isPet = false, forceAxis } = {}) {
  let targetWidth, targetLength;
  let widthAxis = 'width';

  if (forceAxis === 'width') {
    targetWidth = width;
    targetLength = height;
    widthAxis = 'width';
  } else if (forceAxis === 'height') {
    targetWidth = height;
    targetLength = width;
    widthAxis = 'height';
  } else {
    widthAxis = getPreferredRollAxis(width, height);
    if (widthAxis === 'width') {
      targetWidth = width;
      targetLength = height;
    } else {
      targetWidth = height;
      targetLength = width;
    }
  }

  const thickness = parseInt(currentThickness);
  const looseCombos = generateRollWidthCombinations(targetWidth, 'loose', currentThickness, currentProduct);
  const exactCombos = generateRollWidthCombinations(targetWidth, 'exact', currentThickness, currentProduct);
  const extendedExactCombos = generateRollWidthCombinations(
    targetWidth,
    'exact',
    currentThickness,
    currentProduct,
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

  // 제품별로 최대 길이 가져오기
  let maxLength;
  if (typeof getMaxRollLength === 'function') {
    maxLength = getMaxRollLength(currentProduct, currentThickness);
  } else {
    // 폴백: 기존 로직
    const maxLengthTable = ROLL_MAX_LENGTH;
    maxLength = maxLengthTable[thickness] || Infinity;
  }
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

  const lengthIn50cm = rollLength / 50;

  const evaluatedCombos = combinationCandidates.map(combo => {
    const usedWidth = combo.solutions.reduce((sum, sol) => sum + (sol.width * sol.count), 0);
    const widthDiff = usedWidth - targetWidth;
    const wasteAbsCm = Math.abs(widthDiff);

    let comboPrice = 0;
    let valid = true;
    combo.solutions.forEach(sol => {
      // product-config.js의 함수 사용 (있으면)
      let pricePerUnit;
      if (typeof getRollPrice === 'function') {
        pricePerUnit = getRollPrice(currentProduct, currentThickness, sol.width);
      } else {
        // 폴백: 기존 로직
        const priceTable = ROLL_PRICES;
        pricePerUnit = priceTable[thickness]?.[sol.width];
      }

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
    // 1순위: 커버 여부 (커버되는 것 우선) - 필수!
    const aCovers = a.widthDiff >= 0 ? 1 : 0;
    const bCovers = b.widthDiff >= 0 ? 1 : 0;
    if (aCovers !== bCovers) {
      return bCovers - aCovers;
    }
    // 2순위: 롤 개수 (적을수록 좋음)
    if (a.rollCountWithSplit !== b.rollCountWithSplit) {
      return a.rollCountWithSplit - b.rollCountWithSplit;
    }
    // 3순위: 낭비 (적을수록 좋음)
    if (Math.abs(a.wasteAbsCm - b.wasteAbsCm) > 0.0001) {
      return a.wasteAbsCm - b.wasteAbsCm;
    }
    // 4순위: 가격 (저렴할수록 좋음)
    if (Math.abs(a.price - b.price) > 0.0001) {
      return a.price - b.price;
    }
    // 5순위: preferred 여부
    if (a.preferred !== b.preferred) {
      return a.preferred ? -1 : 1;
    }
    // 6순위: 동일 폭 여부
    if (a.sameWidth !== b.sameWidth) {
      return b.sameWidth - a.sameWidth;
    }
    // 7순위: 우선순위 값
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return 0;
  });

  const bestCombo = evaluatedCombos[0];
  const solutions = bestCombo.solutions;
  const totalPrice = bestCombo.price;
  const breakdown = [];

  solutions.forEach(sol => {
    const rollGroupCount = sol.count * splitCount;
    const rollLengthCm = rollLength;
    const countText = splitCount > 1 ? `${sol.count}개 × ${splitCount}롤` : `${sol.count}개`;
    if (isPet) {
      const units = lengthIn50cm * rollGroupCount;
      breakdown.push(`${getThicknessLabel(currentThickness)} - ${sol.width}cm 폭 × 50cm 길이 × ${units}개 (${rollLengthCm}cm 길이 × ${rollGroupCount}개)`);
    } else {
      breakdown.push(`${getThicknessLabel(currentThickness)} - ${sol.width}cm 폭 × ${rollLengthCm}cm 길이 × ${countText}`);
    }
  });

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
    shippingMemo = `► 배송메모: ${cutRequestList.join(', ')}으로 재단요청`;
    breakdown.push(shippingMemo);
  }

  const rollLabel = isPet ? '애견 롤매트' : '유아 롤매트';

  return {
    type: `${rollLabel} - ${getThicknessLabel(currentThickness)}`,
    targetWidth,
    targetLength,
    calculatedLength,
    rollLength,
    splitCount,
    solutions,
    totalPrice,
    price: totalPrice,
    wastePercent,
    breakdown,
    coverageWidth,
    coverageHeight,
    fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight),
    pcs: totalRolls,
    rollCount: totalRolls,
    totalRollUnits,
    shippingMemo,
    widthAxis,
    usedWidth
  };
}

// 복합 매트 최적화 계산 (100cm 우선, 나머지 50cm 4장 세트)
function calculateHybrid(width, height, modeOrOptions, currentProduct, currentThickness) {
  const options = typeof modeOrOptions === 'string'
    ? {
      roundRemainX: modeOrOptions === 'exact' ? ceilDiv : floorDiv,
      roundRemainY: modeOrOptions === 'exact' ? ceilDiv : floorDiv
    }
    : (modeOrOptions || {});

  const roundRemainX = options.roundRemainX || floorDiv;
  const roundRemainY = options.roundRemainY || floorDiv;

  const n100x = Math.floor(width / 100);
  const n100y = Math.floor(height / 100);

  const remainX = width - (n100x * 100);
  const remainY = height - (n100y * 100);

  let total100 = 0;
  let total50Tiles = 0;
  const breakdown = [];

  if (n100x > 0 && n100y > 0) {
    total100 = n100x * n100y;
  }

  const remainXTiles = remainX > 0 ? roundRemainX(remainX, 50) : 0;
  const remainYTiles = remainY > 0 ? roundRemainY(remainY, 50) : 0;

  if (remainX > 0 && n100y > 0 && remainXTiles > 0) {
    const stripHeightTiles = ceilDiv(n100y * 100, 50);
    total50Tiles += remainXTiles * stripHeightTiles;
  }

  if (n100x > 0 && remainY > 0 && remainYTiles > 0) {
    const stripWidthTiles = ceilDiv(n100x * 100, 50);
    total50Tiles += stripWidthTiles * remainYTiles;
  }

  if (remainX > 0 && remainY > 0 && remainXTiles > 0 && remainYTiles > 0) {
    total50Tiles += remainXTiles * remainYTiles;
  }

  const total50Sets = ceilDiv(total50Tiles, 4);

  const pricePerPcs = getCurrentPrice(currentProduct, currentThickness);
  const price = (total100 * pricePerPcs) + (total50Sets * pricePerPcs);

  const area = width * height;
  const usedArea100 = total100 * 100 * 100;
  const usedArea50 = total50Tiles * 50 * 50;
  const totalUsedArea = usedArea100 + usedArea50;
  const wastePercent = area > 0 ? Math.round(((totalUsedArea - area) / totalUsedArea) * 100) : 0;

  const coverageWidth = (n100x * 100) + (remainXTiles * 50);
  const coverageHeight = (n100y * 100) + (remainYTiles * 50);

  if (total100 > 0) breakdown.push(`${getThicknessLabel(currentThickness)} 100×100cm 1pcs: ${total100}장`);
  if (total50Sets > 0) {
    if (total50Tiles === total50Sets * 4) {
      breakdown.push(`${getThicknessLabel(currentThickness)} 50×50cm 4pcs: ${total50Sets}장`);
    } else {
      breakdown.push(`${getThicknessLabel(currentThickness)} 50×50cm 4pcs: ${total50Sets}장 (${total50Tiles}조각 사용)`);
    }
  }

  return {
    type: `복합 매트 (최적화) - ${getThicknessLabel(currentThickness)}`,
    n100x,
    n100y,
    total100,
    total50: total50Sets,
    total50Tiles,
    totalPcs: total100 + total50Sets,
    price,
    wastePercent,
    breakdown,
    coverageWidth,
    coverageHeight,
    fitMessages: createFitMessages(width, height, coverageWidth, coverageHeight)
  };
}

function calculatePuzzleAuto(width, height, currentProduct, currentThickness) {
  const looseResult = calculateHybrid(width, height, 'loose', currentProduct, currentThickness);
  const coverageWidthLoose = looseResult.coverageWidth || 0;
  const coverageHeightLoose = looseResult.coverageHeight || 0;
  const widthShortage = Math.max(0, width - coverageWidthLoose);
  const heightShortage = Math.max(0, height - coverageHeightLoose);

  const needsWidthAdjust = widthShortage >= 25;
  const needsHeightAdjust = heightShortage >= 25;

  if (!needsWidthAdjust && !needsHeightAdjust) {
    return {
      ...looseResult,
      autoModeSource: 'loose'
    };
  }

  const hybridResult = calculateHybrid(width, height, {
    roundRemainX: needsWidthAdjust ? ceilDiv : floorDiv,
    roundRemainY: needsHeightAdjust ? ceilDiv : floorDiv
  }, currentProduct, currentThickness);

  let autoModeSource = 'loose';
  if (needsWidthAdjust && needsHeightAdjust) {
    autoModeSource = 'exact';
  } else if (needsWidthAdjust) {
    autoModeSource = 'width';
  } else if (needsHeightAdjust) {
    autoModeSource = 'height';
  }

  return {
    ...hybridResult,
    autoModeSource
  };
}

// 복합공간 관련 함수 제거됨 (buildRollRectanglesFromPieces)

// 단순 공간 계산
function calculateSimpleSpace(name, width, height, type, mode, currentProduct, currentThickness) {
  const W = clampNonNegInt(width);
  const H = clampNonNegInt(height);

  if (W === 0 || H === 0) {
    return null;
  }

  let result;
  if (type === '50') {
    const appliedMode = mode === 'auto' ? 'loose' : mode;
    result = calculate50(W, H, appliedMode, currentProduct, currentThickness);
  } else if (type === '100') {
    const appliedMode = mode === 'auto' ? 'loose' : mode;
    result = calculate100(W, H, appliedMode, currentProduct, currentThickness);
  } else if (type === 'roll') {
    const appliedMode = mode === 'auto' ? 'loose' : mode;
    result = calculateRollMat(W, H, appliedMode, currentThickness, currentProduct, { isPet: false });
  } else if (type === 'petRoll') {
    const appliedMode = mode === 'auto' ? 'loose' : mode;
    result = calculateRollMat(W, H, appliedMode, currentThickness, currentProduct, { isPet: true });
  } else {
    result = calculatePuzzleAuto(W, H, currentProduct, currentThickness);
  }

  const visualization = createVisualizationData(type, W, H, result);

  const isPuzzleAuto = type === 'hybrid';
  const outputModeKey = isPuzzleAuto ? 'auto' : (mode === 'auto' ? 'loose' : mode);
  const displayMode = isPuzzleAuto ? 'auto' : outputModeKey;

  return {
    name: name,
    width: W,
    height: H,
    spaceType: type,
    visualization,
    ...result,
    mode: getModeLabel(displayMode),
    modeKey: outputModeKey
  };
}

// 복합공간 관련 함수 제거됨 (calculateComplexSpace, buildRollRectanglesFromPiecesY, calculateComplexSpaceRoll)

// 공간 계산 라우터 (단순공간만 처리)
function calculateSpace(name, width, height, type, mode, space, currentProduct, currentThickness) {
  return calculateSimpleSpace(name, width, height, type, mode, currentProduct, currentThickness);
}

