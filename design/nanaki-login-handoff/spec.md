# nanaki 로그인 애니메이션 스펙

레퍼런스 구현: `login-animation.html` — 브라우저로 바로 열어 확인 가능한 반응형 단일 파일(모바일 < 1024px, PC ≥ 1024px). 키프레임·이징·딜레이는 이 파일의 CSS가 원본입니다.

## 파일
- `login-animation.html` — 레퍼런스 구현 (우상단 '다시 재생'은 확인용, 앱에서는 제거)
- `naki-avatar.svg` — 원본 아바타 (반전 색상은 HTML 내 인라인 SVG 참고)
- `nanaki-tokens.json` — 디자인 토큰

## 구현 메모
- "나는 나를 키운다"는 글자 단위 span. 나·나·키는 `.k`, 나머지(공백 포함)는 `.x`로 max-width 0까지 접힘. 스크린리더용 `aria-label` 유지
- 아바타 각 파트는 `transform-box: fill-box` 기준으로 회전/스케일
- 애니메이션 중에도 버튼은 3.5초 이후 등장 — 로그인 상태면 이 화면 자체를 건너뜀

## 공통
- 배경 `accent` #2E7D4F, 텍스트 #FFFFFF, 보조 #DDF2E5
- 아바타 반전: 원 #FFFFFF · 얼굴/줄기/반짝이 #2E7D4F · 눈/입 #FFFFFF · 잎 #6CC08F
- 진입 이징 `cubic-bezier(.2,.8,.2,1)`, 튐 이징 `cubic-bezier(.3,1.4,.5,1)`
- `prefers-reduced-motion: reduce` → 모든 요소 최종 상태로 즉시 표시, 반복 애니메이션 정지

## 타임라인 (초)
| 시작 | 길이 | 요소 | 동작 |
|---|---|---|---|
| 0.0 | 0.55 | 아바타 원 | scale 0 → 1.08 → 1 |
| 0.1 | 0.6 | 워드마크 nanaki | opacity 0→1, translateY 16→0 |
| 0.6 | 2.4 ∞ | 파동 링 ×2 (0.6 / 1.8 시작) | 2px 흰 테두리, scale 1→1.7, opacity .5→0 |
| 0.6 | 3.2 ∞ | 아바타 | translateY 0 ↔ -8 (float) |
| 0.7 | 1.2 | 얼굴 | rotate 0 → -10 → 8 → -6 → 3 → 0 (갸웃) |
| 0.8~ | 3 ∞ | 잎 | ±8° sway · 눈 4초 주기 깜빡임 · 반짝이 2초 twinkle |
| 0.8 | 0.6 | "나는 나를 키운다" (20px/700, #A8D5BA) | opacity 0→1, translateY 16→0 |
| 1.4 / 1.58 / 1.76 | 0.45 | 나 · 나 · 키 | color #A8D5BA → #FFFFFF, 중간에 translateY -6 |
| 2.1 | 0.6 | 는 · 를 · 운 · 다 · 공백 | max-width 1em→0, opacity 1→0, blur 0→6px |
| 2.6 | 0.4 | "나나키" 전체 | scale 1 → 1.2 (유지) |
| 3.1 | 0.6 | 슬로건 | opacity 0→1, translateY 16→0 |
| 3.5 | 0.7 | 버튼 그룹 | opacity 0→1, translateY 16→0 |

## PC (≥1024)
같은 타임라인. 360px 가운데 정렬 한 컬럼 · 워드마크 40px · 아바타 160px · 나나키 24px · 슬로건 18px.
