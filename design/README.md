# design/

Claude 디자인 시안 원본입니다. **참고용**이며 앱 코드에서 import하지 않습니다.
`support.js`는 `.dc.html`을 브라우저에서 미리 보기 위한 Claude 디자인 실행 파일입니다. 직접 수정하지 않고, 시안을 다시 내보낼 때 함께 받은 파일로 교체만 합니다.

## 파일 지도

| 파일 | 내용 | 언제 보나 |
| --- | --- | --- |
| `nanaki_Design_System.dc.html` | 색·타이포·간격·컴포넌트, 맨 위 "00 공통 규칙"(포커스 링 예시) | 공통 컴포넌트, `/design-system` 페이지 |
| `nanaki_Mobile_Screens.dc.html` | 모바일 01~15 전체 (로그인, 홈, 스피드 다이얼, 작성 폼 …) | 화면 흐름 확인 |
| `nanaki_Mobile_Screens_2.dc.html` | 모바일 16~21 (나키 AI, 알림 권한, 예산, 눈바디 …) | step3·4 |
| `nanaki_Desktop_Screens.dc.html` | 태블릿 768~1023 (접힌 사이드바 + 한 줄 배치), PC 1024 이상 (펼친 사이드바 + 좌우 배치), PC 눈바디 불러오기·맞춰 자르기 | 768px 이상 레이아웃 |
| `nanaki_Home.dc.html` | 홈 캘린더. 상태: month, expanded, week, dial, toast, empty | 홈 마크업 |
| `nanaki_Records.dc.html` | 기록 탭. 상태: default, empty, offline, offlineFail | 기록 탭 마크업 |
| `nanaki_Type_Detail.dc.html` | 타입 상세. 타입: expense, review, workout, routine, body | 타입 상세 마크업 |
| `nanaki_AI.dc.html` | 나키 탭. 상태: start, chat, loading, offline | step3 |
| `nanaki_Sidebar.dc.html` | PC 사이드바. 펼침(240px)/접힘(72px), 새 기록 메뉴 | PC·태블릿 레이아웃 |

## 읽는 법 (Claude Code에게)

- `.dc.html`은 Claude 디자인 전용 형식입니다. `{{ }}`, `<sc-if>`, `<sc-for>`, `DCLogic` 구조는 **따라 하지 않고**, 레이아웃·간격·크기·문구만 참고합니다.
- 색은 시안의 `--변수`나 hex 값을 직접 쓰지 않고 `globals.css` 토큰을 씁니다.
- 시안과 `tokens/tokens.json` 값이 다르면 **tokens.json이 최신**입니다.
- 아이콘은 시안의 SVG path를 복사하지 않고 아이콘 라이브러리를 씁니다 (시안 아이콘은 Lucide 모양, 선 두께 1.75).
- 각 파일 아래 `data-props`의 상태 목록(empty, offline 등)은 구현해야 할 화면 상태이자 화면 비교 테스트 대상입니다.
- `hideRoutine` 기본값 true는 시안 미리보기 설정일 뿐입니다. 실제 앱은 첫 실행 시 5개 타입이 모두 켜집니다.
- 안의 숫자·문구 예시(금액, 날짜)는 샘플 데이터입니다.
- 시안은 375×812 고정 프레임이라 요소를 `position:absolute`와 고정 px로 배치합니다. 코드는 흐름 레이아웃(flex·grid)과 반응형 클래스로 짜고, 고정 위치는 하단 탭·플로팅 버튼·토스트에만 씁니다.

## 시안에서 그대로 옮기지 않는 것

- **아이폰 상태 바(9:41)와 홈 바**: 기기 모형입니다. 그리지 않습니다.
- **하단 탭 높이 90px**: 탭 56px + 아이폰 홈 바 여백 34px을 합친 값입니다. 코드는 `height: calc(56px + env(safe-area-inset-bottom))`로 쓰고, 34px을 고정값으로 넣지 않습니다 (tokens.json `layout.tab-bar-height`, `safe-area-bottom`도 같은 뜻).
- **스크롤 영역 아래 여백**: 시안은 맨 아래 콘텐츠가 탭에 가리는지 확인하지 않았습니다. 스크롤 영역에 `padding-bottom: 탭 높이 + 플로팅 버튼 높이 + 여백`을 둡니다.
- **홈 캘린더 칸 금액**: 날짜 칸에는 타입 점만 둡니다 (2026-10-20 결정). `nanaki_Home.dc.html` 스크립트에 남은 `amt`, `fmtAmt` 계산은 쓰지 않는 코드라 무시합니다.
- **카메라 화면**: 앱 테마와 상관없이 다크 토큰으로 고정합니다 (tokens.json `exceptions.camera-screen`).

## 토큰 메모

- 포커스 링: 바탕 2px 간격 + 링 2px (tokens.json `effect.focus-ring`). 코드는 `box-shadow` 대신 `outline: 2px` + `outline-offset: 2px`로 같은 모양을 만든다 (고대비 모드에서도 보이고, 그림자·링과 충돌하지 않음).
- 가로 스크롤 칩 끝 흐림: 24px, `bg` 색으로 사라짐. 시작 위치에서는 왼쪽 흐림 없음, 끝까지 스크롤하면 오른쪽 흐림 없음 (`effect.scroll-fade`).
- warning 색은 가계부 색과 가까우므로 경고에는 항상 경고 아이콘을 함께 씁니다.
- **`type-expense`(가계부 색)는 tokens.json이 최신**입니다 (`#8A6700` / `#E0B44A`). 시안의 `#9A5C00` 계열은 따르지 않습니다. warning(`#C2410C`, 붉은 주황)과 구분되도록 노란 쪽으로 둡니다.
- 레이아웃 값(브레이크포인트 768/1024, 사이드바 240/72, 상세 패널 400, 채팅 최대 너비 720)은 tokens.json `layout`을 따릅니다.
- `accent-hover`, `danger-hover`, `danger-pressed`는 토큰 내보내기에서 빠져 있어 tokens.json에 직접 추가했습니다 (시안과 같은 값). 다시 내보낼 때 빠지지 않았는지 확인합니다.

## 홈 캘린더: 시안과 다르게 한 것 (2026-10-21 결정)

- **머리**: `‹ 2026년 10월 › … [오늘] ⚙`. 이동 버튼은 테두리 없는 아이콘 버튼. "오늘" 글자 버튼 대신 **오늘 날짜가 적힌 달력 아이콘**을 쓰고, 모바일·PC 같은 자리에 둡니다.
- **주 보기 없음**: 시안의 주 보기(`week` 상태)와 월·주 전환은 두지 않습니다. 하루 요약이 짧아 접어서 얻는 공간이 적고, 이 앱은 한 달을 점으로 훑어보는 것이 중심이라 월 캘린더 하나로 갑니다.
- **하루 요약 머리**: `10월 16일 금요일`(요일을 줄이지 않음) + 오늘이면 뱃지. 날짜 이동 ‹ › 버튼은 두지 않습니다. 날짜는 캘린더 칸을 눌러(키보드는 방향키로) 고릅니다.
- **타입 줄**: 이름과 값 사이를 가운뎃점 대신 콜론으로 (`가계부 1건: -12,500원`).
