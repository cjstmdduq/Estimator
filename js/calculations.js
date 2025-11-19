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
  return null; // 롤매트는 별도 처리
}

// 롤매트 두께별 사용 가능한 폭 목록
function getAvailableRollWidths(currentThickness) {
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
function generateRollWidthCombinations(targetWidth, mode, currentThickness, { exactOverageCap = EXACT_OVERAGE_CAP_CM } = {}) {
  const thickness = parseInt(currentThickness);
  const availableWidths = getAvailableRollWidths(currentThickness);
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

// 롤매트 계산 함수
function calculateRollMat(width, height, mode, currentThickness, { isPet = false, forceAxis } = {}) {
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
  const looseCombos = generateRollWidthCombinations(targetWidth, 'loose', currentThickness);
  const exactCombos = generateRollWidthCombinations(targetWidth, 'exact', currentThickness);
  const extendedExactCombos = generateRollWidthCombinations(
    targetWidth,
    'exact',
    currentThickness,
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

function buildRollRectanglesFromPieces(pieces) {
  const xEdges = new Set();
  pieces.forEach(piece => {
    xEdges.add(piece.x);
    xEdges.add(piece.x + piece.w);
  });

  const sortedX = [...xEdges].sort((a, b) => a - b);
  const rectangles = [];

  for (let i = 0; i < sortedX.length - 1; i++) {
    const startX = sortedX[i];
    const endX = sortedX[i + 1];
    if (endX <= startX) continue;

    const coveringPieces = pieces.filter(piece => piece.x <= startX && piece.x + piece.w >= endX);
    if (coveringPieces.length === 0) continue;
    const primaryPieceIndex = coveringPieces[0].index !== undefined ? coveringPieces[0].index : 0;

    const intervals = coveringPieces
      .map(piece => [piece.y, piece.y + piece.h])
      .sort((a, b) => a[0] - b[0]);

    let current = null;
    intervals.forEach(([startY, endY]) => {
      if (current === null) {
        current = [startY, endY];
      } else if (startY <= current[1]) {
        current[1] = Math.max(current[1], endY);
      } else {
        const height = current[1] - current[0];
        if (height > 0) {
          rectangles.push({
            startX,
            endX,
            startY: current[0],
            endY: current[1],
            width: endX - startX,
            height,
            pieceIndex: primaryPieceIndex
          });
        }
        current = [startY, endY];
      }
    });

    if (current) {
      const height = current[1] - current[0];
      if (height > 0) {
        rectangles.push({
          startX,
          endX,
          startY: current[0],
          endY: current[1],
          width: endX - startX,
          height,
          pieceIndex: primaryPieceIndex
        });
      }
    }
  }

  return rectangles;
}

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
    result = calculateRollMat(W, H, appliedMode, currentThickness, { isPet: false });
  } else if (type === 'petRoll') {
    const appliedMode = mode === 'auto' ? 'loose' : mode;
    result = calculateRollMat(W, H, appliedMode, currentThickness, { isPet: true });
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

// 복합 공간 계산
function calculateComplexSpace(name, pieces, type, mode, currentProduct, currentThickness) {
  if (!pieces || pieces.length === 0) return null;

  const isPuzzleAuto = type === 'hybrid';
  const isRollMat = type === 'roll' || type === 'petRoll';
  
  let appliedMode = isPuzzleAuto ? 'auto' : (mode === 'auto' ? 'loose' : mode);
  if (isPuzzleAuto && mode === 'auto') {
    let needsExactMode = false;
    for (const piece of pieces) {
      const looseResult = calculateHybrid(piece.w, piece.h, 'loose', currentProduct, currentThickness);
      const widthShortage = Math.max(0, piece.w - (looseResult.coverageWidth || 0));
      const heightShortage = Math.max(0, piece.h - (looseResult.coverageHeight || 0));
      
      if (widthShortage >= 25 || heightShortage >= 25) {
        needsExactMode = true;
        break;
      }
    }
    
    if (needsExactMode) {
      appliedMode = 'exact';
    } else {
      appliedMode = 'loose';
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pieces.forEach(piece => {
    minX = Math.min(minX, piece.x);
    maxX = Math.max(maxX, piece.x + piece.w);
    minY = Math.min(minY, piece.y);
    maxY = Math.max(maxY, piece.y + piece.h);
  });

  const offsetX = -minX;
  const offsetY = -minY;
  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;

  if (isRollMat) {
    return calculateComplexSpaceRoll(name, pieces, type, mode, boundingWidth, boundingHeight, offsetX, offsetY, currentThickness);
  }

  const gridSize = 50;
  const gridCols = Math.ceil(boundingWidth / gridSize);
  const gridRows = Math.ceil(boundingHeight / gridSize);
  const occupancyGrid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));

  pieces.forEach((piece, pieceIdx) => {
    const basePieceX = piece.x + offsetX;
    const basePieceY = piece.y + offsetY;

    const startCol = Math.floor(basePieceX / gridSize);
    const startRow = Math.floor(basePieceY / gridSize);
    const endCol = Math.ceil((basePieceX + piece.w) / gridSize);
    const endRow = Math.ceil((basePieceY + piece.h) / gridSize);

    for (let row = startRow; row < endRow && row < gridRows; row++) {
      for (let col = startCol; col < endCol && col < gridCols; col++) {
        const cellX = col * gridSize;
        const cellY = row * gridSize;
        const cellEndX = cellX + gridSize;
        const cellEndY = cellY + gridSize;

        const overlapX = Math.min(basePieceX + piece.w, cellEndX) - Math.max(basePieceX, cellX);
        const overlapY = Math.min(basePieceY + piece.h, cellEndY) - Math.max(basePieceY, cellY);

        if (overlapX > 0 && overlapY > 0) {
          const currentPieceIndex = piece.index !== undefined ? piece.index : pieceIdx;
          if (occupancyGrid[row][col] === null) {
            occupancyGrid[row][col] = currentPieceIndex;
          } else {
            // 겹치는 경우 번호가 빠른(인덱스가 작은) 조각 우선
            const existingIndex = occupancyGrid[row][col];
            if (currentPieceIndex < existingIndex) {
              occupancyGrid[row][col] = currentPieceIndex;
            }
          }
        }
      }
    }
  });

  const tileMap = new Map();
  const used100Grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  for (let row = 0; row < gridRows - 1; row++) {
    for (let col = 0; col < gridCols - 1; col++) {
      if (occupancyGrid[row][col] !== null && occupancyGrid[row][col + 1] !== null &&
          occupancyGrid[row + 1][col] !== null && occupancyGrid[row + 1][col + 1] !== null &&
          !used100Grid[row][col] && !used100Grid[row][col + 1] &&
          !used100Grid[row + 1][col] && !used100Grid[row + 1][col + 1]) {

        const tileX = col * gridSize;
        const tileY = row * gridSize;
        const key = `${tileX},${tileY},100`;
        const pieceIndex = occupancyGrid[row][col];
        tileMap.set(key, { x: tileX, y: tileY, size: 100, pieceIndex });

        used100Grid[row][col] = true;
        used100Grid[row][col + 1] = true;
        used100Grid[row + 1][col] = true;
        used100Grid[row + 1][col + 1] = true;
      }
    }
  }

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (occupancyGrid[row][col] !== null && !used100Grid[row][col]) {
        const tileX = col * gridSize;
        const tileY = row * gridSize;
        const key = `${tileX},${tileY},50`;
        const pieceIndex = occupancyGrid[row][col];
        tileMap.set(key, { x: tileX, y: tileY, size: 50, pieceIndex });
      }
    }
  }

  let validTotal100 = 0;
  let validTotal50Tiles = 0;

  tileMap.forEach(tile => {
    if (tile.size === 100) {
      validTotal100++;
    } else if (tile.size === 50) {
      validTotal50Tiles++;
    }
  });

  const total50Sets = Math.ceil(validTotal50Tiles / 4);
  const pricePerPcs = getCurrentPrice(currentProduct, currentThickness);
  const totalPrice = (validTotal100 * pricePerPcs) + (total50Sets * pricePerPcs);
  const totalPcs = validTotal100 + total50Sets;

  const actualArea = pieces.reduce((sum, p) => sum + (p.w * p.h), 0);
  const usedArea = (validTotal100 * 100 * 100) + (validTotal50Tiles * 50 * 50);
  const wastePercent = usedArea > 0 ? Math.round(((usedArea - actualArea) / usedArea) * 100) : 0;

  const breakdown = [];
  if (validTotal100 > 0) {
    breakdown.push(`${getThicknessLabel(currentThickness)} 100×100cm 1pcs: ${validTotal100}장`);
  }
  if (total50Sets > 0) {
    if (validTotal50Tiles === total50Sets * 4) {
      breakdown.push(`${getThicknessLabel(currentThickness)} 50×50cm 4pcs: ${total50Sets}장`);
    } else {
      breakdown.push(`${getThicknessLabel(currentThickness)} 50×50cm 4pcs: ${total50Sets}장 (${validTotal50Tiles}조각 사용)`);
    }
  }

  const outputModeKey = isPuzzleAuto ? 'auto' : appliedMode;
  const displayMode = isPuzzleAuto ? 'auto' : appliedMode;

  const result = {
    name: name,
    mode: getModeLabel(displayMode),
    modeKey: outputModeKey,
    spaceType: type,
    type: '복합 공간 (통합 계산) - ' + getThicknessLabel(currentThickness),
    price: totalPrice,
    breakdown: breakdown,
    total50: total50Sets,
    total100: validTotal100,
    total50Tiles: validTotal50Tiles,
    totalPcs: totalPcs,
    wastePercent: wastePercent,
    fitMessages: [],
    coverageWidth: boundingWidth,
    coverageHeight: boundingHeight,
    width: boundingWidth,
    height: boundingHeight,
    n100x: 0,
    n100y: 0
  };

  result.visualization = createComplexVisualization(pieces, type, mode, tileMap);

  return result;
}

// 복합 공간 롤매트 계산
function calculateComplexSpaceRoll(name, pieces, type, mode, boundingWidth, boundingHeight, offsetX, offsetY, currentThickness) {
  const isPet = type === 'petRoll';

  const normalizedPieces = pieces.map(piece => ({
    ...piece,
    x: piece.x + offsetX,
    y: piece.y + offsetY
  }));

  const rectangles = buildRollRectanglesFromPieces(normalizedPieces);
  if (rectangles.length === 0) {
    return null;
  }

  const actualArea = rectangles.reduce((sum, rect) => sum + (rect.width * rect.height), 0);
  if (actualArea === 0) return null;

  // 각 직사각형마다 최적의 방향을 자동 선택
  const rollResults = [];

  rectangles.forEach(rect => {
    if (rect.width <= 0 || rect.height <= 0) return;

    // 가로/세로 두 방향 모두 시도
    const candidates = [];

    ['width', 'height'].forEach(axis => {
      let rollResult = null;
      if (mode === 'auto') {
        const looseResult = calculateRollMat(rect.width, rect.height, 'loose', currentThickness, { isPet, forceAxis: axis });
        if (looseResult) {
          const usedWidth = looseResult.usedWidth || rect.width;
          const actualRollLength = looseResult.rollLength || (looseResult.widthAxis === 'width'
            ? looseResult.coverageHeight
            : looseResult.coverageWidth);
          const checkTargetLength = looseResult.widthAxis === 'width' ? rect.height : rect.width;

          const widthShortage = Math.max(0, rect.width - usedWidth);
          const lengthShortage = Math.max(0, checkTargetLength - actualRollLength);

          const needsWidthAdjust = widthShortage >= 20;
          const needsLengthAdjust = lengthShortage >= 20;

          if (needsWidthAdjust || needsLengthAdjust) {
            rollResult = calculateRollMat(rect.width, rect.height, 'exact', currentThickness, { isPet, forceAxis: axis });
          } else {
            rollResult = looseResult;
          }
        }
      } else {
        rollResult = calculateRollMat(rect.width, rect.height, mode, currentThickness, { isPet, forceAxis: axis });
      }

      if (rollResult && rollResult.solutions) {
        candidates.push({
          axis,
          rollResult,
          price: rollResult.price || 0,
          rollCount: rollResult.rollCount || 0,
          wastePercent: rollResult.wastePercent || 0
        });
      }
    });

    // 최적의 방향 선택 (롤 개수 우선 - 임시)
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (a.rollCount !== b.rollCount) return a.rollCount - b.rollCount;
        if (Math.abs(a.price - b.price) > 0.0001) return a.price - b.price;
        return a.wastePercent - b.wastePercent;
      });

      rollResults.push({
        rect,
        rollResult: candidates[0].rollResult
      });
    }
  });

  // 각 직사각형별로 집계
  let totalPrice = 0;
  let totalRollCount = 0;
  let totalRollUnits = 0;
  let usedArea = 0;
  const breakdown = [];
  const shippingMemoSet = new Set();
  const visualStripes = [];

  rollResults.forEach(({ rect, rollResult }) => {
    totalPrice += rollResult.price || 0;
    totalRollCount += rollResult.rollCount || 0;
    totalRollUnits += rollResult.totalRollUnits || 0;

    const rollLength = rollResult.rollLength || 0;
    const splitCount = rollResult.splitCount || 1;
    const usedWidth = rollResult.usedWidth || rect.width;
    usedArea += usedWidth * rollLength * splitCount;

    // breakdown 추가
    if (Array.isArray(rollResult.breakdown) && rollResult.breakdown.length > 0) {
      rollResult.breakdown.forEach(line => breakdown.push(line));
    }

    // 시각화 stripe 생성 - 각 직사각형의 위치에 맞춰서
    const actualRollLength = rollResult.rollLength || (rollResult.widthAxis === 'width'
      ? rollResult.coverageHeight
      : rollResult.coverageWidth);

    if (Array.isArray(rollResult.solutions)) {
      if (rollResult.widthAxis === 'width') {
        let offsetX = rect.startX;
        rollResult.solutions.forEach(sol => {
          for (let i = 0; i < sol.count; i++) {
            for (let split = 0; split < splitCount; split++) {
              visualStripes.push({
                x: offsetX,
                y: rect.startY + (split * actualRollLength),
                width: sol.width,
                height: actualRollLength,
                label: `${sol.width}×${actualRollLength}cm`,
                pieceIndex: rect.pieceIndex || 0
              });
            }
            offsetX += sol.width;
          }
        });
      } else {
        let offsetY = rect.startY;
        rollResult.solutions.forEach(sol => {
          for (let i = 0; i < sol.count; i++) {
            for (let split = 0; split < splitCount; split++) {
              visualStripes.push({
                x: rect.startX + (split * actualRollLength),
                y: offsetY,
                width: actualRollLength,
                height: sol.width,
                label: `${actualRollLength}×${sol.width}cm`,
                pieceIndex: rect.pieceIndex || 0
              });
            }
            offsetY += sol.width;
          }
        });
      }
    }

    // 배송 메모
    if (rollResult.shippingMemo) {
      shippingMemoSet.add(rollResult.shippingMemo);
    }
  });

  const wastePercent = usedArea > 0
    ? Math.round(((usedArea - actualArea) / usedArea) * 100)
    : 0;

  const best = {
    totalPrice,
    totalRollCount,
    totalRollUnits,
    usedArea,
    wastePercent,
    breakdown,
    shippingMemo: shippingMemoSet.size > 0 ? Array.from(shippingMemoSet).join(' / ') : '',
    visualStripes
  };

  const result = {
    name: name,
    mode: getModeLabel(mode),
    modeKey: mode,
    spaceType: type,
    type: type === 'roll'
      ? '복합 유아 롤매트 (통합 계산) - ' + getThicknessLabel(currentThickness)
      : '복합 애견 롤매트 (통합 계산) - ' + getThicknessLabel(currentThickness),
    price: best.totalPrice,
    breakdown: best.breakdown.length > 0 ? best.breakdown : ['계산된 롤매트가 없습니다.'],
    rollCount: best.totalRollCount,
    totalRollUnits: best.totalRollUnits,
    fitMessages: best.rollResult?.fitMessages || [],
    coverageWidth: boundingWidth,
    coverageHeight: boundingHeight,
    width: boundingWidth,
    height: boundingHeight,
    wastePercent: best.wastePercent,
    shippingMemo: best.shippingMemo
  };

  result.visualization = {
    type: 'complex',
    space: { width: boundingWidth, height: boundingHeight },
    coverage: { width: boundingWidth, height: boundingHeight },
    pieces: normalizedPieces,
    tiles: best.visualStripes.map(stripe => ({
      x: stripe.x,
      y: stripe.y,
      width: stripe.width,
      height: stripe.height,
      size: Math.max(stripe.width, stripe.height),
      label: stripe.label,
      pieceIndex: stripe.pieceIndex !== undefined ? stripe.pieceIndex : 0
    })),
    widthAxis: best.axis,
    gridMinor: 10,
    gridMajor: 50
  };

  return result;
}

// 공간 계산 라우터
function calculateSpace(name, width, height, type, mode, space, currentProduct, currentThickness) {
  if (!space || !space.pieces || space.pieces.length === 0) {
    return calculateSimpleSpace(name, width, height, type, mode, currentProduct, currentThickness);
  }
  
  if (space.pieces.length === 1) {
    const piece = space.pieces[0];
    return calculateSimpleSpace(name, piece.w, piece.h, type, mode, currentProduct, currentThickness);
  }
  
  return calculateComplexSpace(name, space.pieces, type, mode, currentProduct, currentThickness);
}

