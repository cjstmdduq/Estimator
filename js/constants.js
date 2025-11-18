// 상수 및 설정값

// 정확(≥) 조합에서 허용하는 최대 과충족(cm)
const EXACT_OVERAGE_CAP_CM = 20;
// 대체 조합 탐색 시 허용할 최대 과충족(cm)
const EXTENDED_EXACT_OVERAGE_CAP_CM = 80;
// 길이 방향 여유/부족 허용 임계치(cm)
const LENGTH_RELAXATION_THRESHOLD_CM = 20;

// 보완 옵션 임계치(부족폭 cm 이상이면 추가 롤 제안)
const COMPLEMENT_GAP_THRESHOLD_CM = 15;
// 보완 시 선호 폭 순서 (사용 가능 폭과 교집합 적용)
const PREFERRED_COMPLEMENT_WIDTHS = [110, 125, 140, 70];

// 고객 선호 폭 선택 규칙 (폭 기준, cm)
const PREFERRED_WIDTH_RULES = [
  { min: 150, max: 170, prefer: [{ width: 110, count: 2, mode: 'exact' }] },
  { min: 180, max: 190, prefer: [{ width: 110, count: 2, mode: 'exact' }] }
];

// SVG 네임스페이스
const SVG_NS = 'http://www.w3.org/2000/svg';

// 통화 포맷터
const KRW = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

