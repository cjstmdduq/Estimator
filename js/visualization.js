// 시각화 함수들

// 퍼즐매트 시각화 생성
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

// 복합 공간 시각화 (L자, T자 등)
function createComplexVisualization(pieces, type, mode, tileMap) {
  if (!pieces || pieces.length === 0) return null;

  const minorGrid = 10;
  const majorGrid = 50;
  const allTiles = [];

  // Bounding Box 계산
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pieces.forEach(piece => {
    minX = Math.min(minX, piece.x);
    maxX = Math.max(maxX, piece.x + piece.w);
    minY = Math.min(minY, piece.y);
    maxY = Math.max(maxY, piece.y + piece.h);
  });
  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;

  // 오프셋 계산 (음수 좌표 처리)
  const offsetX = -minX;
  const offsetY = -minY;

  // tileMap이 제공된 경우 (퍼즐매트) - 실제 계산된 타일 사용
  if (tileMap && type === 'hybrid') {
    tileMap.forEach(tile => {
      allTiles.push({
        x: tile.x,
        y: tile.y,
        width: tile.size,
        height: tile.size,
        size: tile.size,
        pieceIndex: tile.pieceIndex
      });
    });
  } else if (Array.isArray(tileMap) && (type === 'roll' || type === 'petRoll')) {
    // 롤매트: 사각형 병합 결과를 그대로 그리기 (겹침 제거 시각화)
    tileMap.forEach((rect, idx) => {
      allTiles.push({
        x: rect.startX,
        y: rect.startY,
        width: rect.width,
        height: rect.height,
        size: Math.max(rect.width, rect.height),
        pieceIndex: rect.pieceIndex !== undefined ? rect.pieceIndex : idx
      });
    });
  } else {
    // 롤매트 등 다른 타입은 기존 방식 유지
    pieces.forEach((piece, pieceIdx) => {
      const pieceResult = calculateSimpleSpace('', piece.w, piece.h, type, mode);

      if (!pieceResult || !pieceResult.visualization) return;

      const vis = pieceResult.visualization;

      if (vis.tiles) {
        // 퍼즐매트: 각 조각의 (0,0)부터 타일 시작
        vis.tiles.forEach(tile => {
          allTiles.push({
            ...tile,
            x: tile.x + piece.x + offsetX,
            y: tile.y + piece.y + offsetY,
            pieceIdx: pieceIdx
          });
        });
      } else if (vis.stripes) {
        // 롤매트: 각 조각의 (0,0)부터 스트라이프 시작
        vis.stripes.forEach(stripe => {
          allTiles.push({
            ...stripe,
            x: stripe.x + piece.x + offsetX,
            y: stripe.y + piece.y + offsetY,
            pieceIdx: pieceIdx
          });
        });
      }
    });
  }

  // pieces도 오프셋 적용
  const normalizedPieces = pieces.map(piece => ({
    ...piece,
    x: piece.x + offsetX,
    y: piece.y + offsetY
  }));

  return {
    type: 'complex',
    space: { width: boundingWidth, height: boundingHeight },
    coverage: { width: boundingWidth, height: boundingHeight },
    pieces: normalizedPieces, // 정규화된 조각 정보
    tiles: allTiles,
    gridMinor: minorGrid,
    gridMajor: majorGrid
  };
}

// 롤매트 시각화 생성
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

// 시각화 데이터 생성 (공간 타입에 따라 적절한 시각화 함수 호출)
function createVisualizationData(spaceType, spaceWidth, spaceHeight, result) {
  if (!result) return null;
  if (spaceType === 'roll' || spaceType === 'petRoll') {
    return createRollVisualization(spaceWidth, spaceHeight, result);
  }
  return createPuzzleVisualization(spaceWidth, spaceHeight, result.coverageWidth ?? spaceWidth, result.coverageHeight ?? spaceHeight, result);
}

