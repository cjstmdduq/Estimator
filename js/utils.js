// 유틸리티 함수들

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

function getModeLabel(mode) {
  if (mode === 'exact') return '정확히 맞추기';
  if (mode === 'auto') return '최적조합';
  return '여유있게 깔기';
}

