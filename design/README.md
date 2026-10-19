# design/

Claude 디자인 시안 원본입니다. **참고용**이며 앱 코드에서 import하지 않습니다.

## 파일 지도

| 파일                              | 내용                                                       | 언제 보나                              |
| --------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `nanaki_Design_System.dc.html`    | 색·타이포·간격·컴포넌트                                    | 공통 컴포넌트, `/design-system` 페이지 |
| `nanaki_Mobile_Screens.dc.html`   | 모바일 01~15 전체 (로그인, 홈, 스피드 다이얼, 작성 폼 …)   | 화면 흐름 확인                         |
| `nanaki_Mobile_Screens_2.dc.html` | 모바일 16~21 (나키 AI, 알림 권한, 예산, 눈바디 …)          | step3·4                                |
| `nanaki_Desktop_Screens.dc.html`  | PC·태블릿 (사이드바, 좌우 배치)                            | 768px 이상 레이아웃                    |
| `nanaki_Home.dc.html`             | 홈 캘린더. 상태: month, expanded, week, dial, toast, empty | 홈 마크업                              |
| `nanaki_Records.dc.html`          | 기록 탭. 상태: default, empty, offline, offlineFail        | 기록 탭 마크업                         |
| `nanaki_Type_Detail.dc.html`      | 타입 상세. 타입: expense, review, workout, routine, body   | 타입 상세 마크업                       |
| `nanaki_AI.dc.html`               | 나키 탭. 상태: start, chat, loading, offline               | step3                                  |
| `nanaki_Sidebar.dc.html`          | PC 사이드바. 펼침/접힘, 새 기록 메뉴                       | PC 레이아웃                            |

## 읽는 법 (Claude Code에게)

- `.dc.html`은 Claude 디자인 전용 형식입니다. `{{ }}`, `<sc-if>`, `<sc-for>`, `DCLogic` 구조는 **따라 하지 않고**, 레이아웃·간격·크기·문구만 참고합니다.
- 색은 시안의 `--변수`나 hex 값을 직접 쓰지 않고 `globals.css` 토큰을 씁니다.
- 아이콘은 시안의 SVG path를 복사하지 않고 아이콘 라이브러리를 씁니다 (시안 아이콘은 Lucide 모양).
- 각 파일 아래 `data-props`의 상태 목록(empty, offline 등)은 구현해야 할 화면 상태이자 화면 비교 테스트 대상입니다.
- `hideRoutine` 기본값 true는 시안 미리보기 설정일 뿐입니다. 실제 앱은 첫 실행 시 5개 타입이 모두 켜집니다.
- 안의 숫자·문구 예시(금액, 날짜)는 샘플 데이터입니다.
- 가계부 색은 시안보다 tokens.json이 최신
