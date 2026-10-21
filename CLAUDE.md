# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따르는 규칙이다.
이 프로젝트는 **학습과 제작을 동시에 하는 포트폴리오**다. Claude가 구현하고,
사용자는 코드의 "왜" 주석과 `private/learning/`의 학습 노트로 따로 공부해 면접에서 설명할 수 있게 한다.

---

## 1. 목적

- **무엇을**: nanaki ("나는 나를 키운다") 자기관리 PWA. 가계부·후기·운동·루틴·체형 5개 타입을 하나의 공통 `기록` 모델로 저장하고,
  검색·필터와 AI 채팅(자연어 → 필터 조건)으로 다시 찾아본다.
- **왜**: 흩어진 생활 기록을 한곳에 모으고, "지난달 외식비 얼마였지?" 같은 질문에 바로 답을 얻기 위해.
- **포트폴리오로 증명할 것**: 공통 컴포넌트 설계(스키마 기반 폼·필터), 성능 개선(전후 수치),
  테스트, CI/CD, 오프라인 우선 설계. 기획부터 배포까지 1인 진행.
- **핵심 원칙**: 기록은 "일어난 일"만 담는다. 반복 규칙(루틴, 고정지출, 체형 측정 주기)은 공통 `Schedule` 구조로 따로 두고, 수행 결과만 기록이다.
- **타입 설정**: 첫 실행 시 구현된 타입 모두 켜짐(step1은 가계부·후기). 설정에서 끄면 숨기기만 하고 데이터는 지우지 않는다.
- **미구현 기능은 숨김**: "준비 중" 비활성 버튼을 만들지 않는다. 나키 탭은 step3, 기록 탭 검색창은 step2, 보고서 버튼은 step4부터 보인다.
- **계정**: 로그인 필수, 구글 로그인만. "체험하기"는 Supabase 익명 로그인 + 샘플 데이터, 3일 뒤 자동 삭제.
- **화면**: 하단 탭 홈·기록·나키(AI 챗봇 이름, 글자 옆 "AI" 뱃지), 우하단 스피드 다이얼(작성 전용), 설정은 홈 ⚙. 768px 미만 모바일, 768~1023px 태블릿(접힌 사이드바 + 한 줄 배치), 1024px 이상 PC(펼친 사이드바 + 좌우 배치). PC는 사이드바에 설정·새 기록. 다크모드 지원.
- **고정값**: 한국어, 원화, kg, cm. 날짜(`occurredAt`)는 로컬 'YYYY-MM-DD' 문자열.
- **단계**: step1 로그인·체험, 가계부·후기, 홈 캘린더, 반응형·다크모드, CI/CD(lint·typecheck·단위·build + E2E 1개), RLS 테스트 → step2 운동·루틴·체형, 검색·필터, 오프라인 이동 실험 → 동기화, 캘린더·초기 로딩 성능 측정, Lighthouse CI, Sentry (끝나면 지원 시작)
  → step3 AI, 예산·고정지출, 푸시 → step4 눈바디 사진(모바일 촬영, PC는 불러오기와 맞춰 자르기), 후기 사진(같은 업로드 과정), 보고서, 백업, 성능 개선. 상세는 기획서를 따른다.

## 2. 기술 스택

| 영역               | 선택                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 프레임워크         | Next.js (App Router) + TypeScript (strict)                                                                                                                                            |
| PWA                | Serwist                                                                                                                                                                               |
| 로컬 저장·오프라인 | Dexie.js (IndexedDB) + outbox 동기화 (step2). 기준 데이터는 서버, `updatedAt`은 서버가 붙이고 충돌은 마지막 저장 우선                                                                 |
| 서버 상태          | TanStack Query                                                                                                                                                                        |
| UI 상태            | Zustand                                                                                                                                                                               |
| 폼·검증            | React Hook Form + Zod                                                                                                                                                                 |
| 스타일·컴포넌트    | Tailwind CSS + Radix UI, 캘린더는 date-fns로 직접 구현                                                                                                                                |
| 백엔드             | Supabase (Postgres + RLS, Auth, Storage 비공개 버킷, Edge Function, pg_cron)                                                                                                          |
| AI                 | 무료 티어 모델, Next.js Route Handler에서 호출, 어댑터 파일 하나로 감싼다. 질문과 필드 정의(이름·종류·기본 선택지)만 보내고 필터 JSON을 받아 Zod로 검증 후 RLS 권한으로 Supabase 조회 |
| 알림               | pg_cron + Edge Function + Web Push                                                                                                                                                    |
| 테스트             | Vitest, Testing Library (+ jsdom: 훅·컴포넌트 테스트용 가짜 브라우저 환경), MSW, Playwright (E2E + 375/768/1024/1280/1440 + 1280×700 + 터치 기기 프리셋 화면 비교)                    |
| CI/CD·운영         | GitHub Actions, Lighthouse CI, Vercel (기본 도메인), Sentry (step2)                                                                                                                   |

- 위 목록에 없는 라이브러리를 추가하려면 먼저 사용자에게 **이유와 대안**을 제시하고 승인을 받는다.
- AI 제공자 SDK는 어댑터 파일 밖에서 import하지 않는다. API 키는 서버(Route Handler)에만 둔다. 사용자가 직접 입력한 선택지(`customOptions`)와 기록 내용은 AI에 보내지 않는다.
- 기록 저장·조회는 한 파일의 함수로만 한다(컴포넌트·훅에서 Supabase를 직접 부르지 않음). step2에서 그 안만 Dexie + outbox로 바꾼다.
- `RecordEntry`는 `type`으로 갈라지는 판별 유니온으로 쓰고, `fields` 타입은 타입별 Zod 스키마에서 `z.infer`로 만든다. `Record<string, unknown>`은 검증 전 단계에서만.
- 몸 사진은 업로드 전 압축, 만료 링크로만 보여 주고, AI·보고서에는 넣지 않는다. 압축 전에 EXIF 회전을 바로잡고(`createImageBitmap`의 `imageOrientation: 'from-image'`), 다시 인코딩해 위치 정보를 지운다.
- 카메라 촬영 UI는 화면 너비가 아니라 기기 능력(`navigator.mediaDevices?.getUserMedia`, `(pointer: coarse)`)으로 보여 준다. PC는 웹캠 촬영 없이 불러오기(끌어다 놓기 포함)만 제공한다. 사진은 JPG·PNG·WebP만 받고 HEIC는 안내 문구를 보여 준다. HEIC 변환 라이브러리는 용량 때문에 별도 승인.
- 푸시 구독은 기기 단위다. `push_subscriptions`에 기기마다 저장하고, 발송은 사용자의 모든 구독으로, 410 응답 구독은 삭제한다.
- 로그아웃 시 IndexedDB와 서비스 워커 캐시를 지운다(미전송 기록은 먼저 확인). 몸 사진 응답은 서비스 워커가 캐시하지 않는다.

## 3. 코드맵

> 실제 구조가 생기면 이 섹션을 채운다. `(예정)`은 아직 없는 폴더.

```
src/
  app/            라우트 (Next.js App Router). globals.css = 디자인 토큰 CSS 변수 + Tailwind 연결
                  auth/callback/ = 구글 로그인 뒤 code를 세션으로 바꾸는 Route Handler
                  api/account/ = 계정 삭제 Route Handler (DELETE, secret 키로 본인 계정만). API는 proxy가 로그인 화면으로 보내지 않고 스스로 401
                  (app)/ = 로그인 뒤 화면 묶음(/, /records, /records/new, /records/[id](/edit), /records/type/[type], /settings).
                  records/layout.tsx = PC에서 목록(왼쪽) + 상세·폼(오른쪽) 패널. 주소에 안 나타나는 괄호 폴더
  proxy.ts        모든 요청 앞의 문지기. 세션 갱신 + 로그인 안 했으면 /login으로 (공개 주소는 features/auth)
  shared/         공통 코드. ui/ = 공통 컴포넌트(Radix + Tailwind, 확인 창 ConfirmDialog 포함), theme/ = 다크·라이트 전환,
                  layout/ = 사이드바·하단 탭(메뉴 목록은 navItems.ts 한 곳), query/ = TanStack Query Provider,
                  toast/ = 화면을 옮겨도 남는 알림(Zustand 저장소 + Radix Toast, 앱 틀에 하나),
                  date/ = 날짜 도우미(로컬 YYYY-MM-DD, YYYY-MM 달 계산, date-fns 캘린더 계산(calendar.ts), 브라우저에서만 읽는 오늘 useToday)
  features/       기능 단위 모듈. auth/ = 로그인·로그아웃(authActions), 지금 계정(useCurrentUser). 이후 search, chat ...
                  settings/ = 설정 화면. api/settingsStore = 설정 저장·조회의 유일한 입구(user_settings),
                  typeVisibility = 숨긴 타입 계산(순수 함수), hooks/useUserSettings = 설정 훅 + 켜진 타입(useVisibleTypes)
                  calendar/ = 홈 캘린더. calendarState = 주소(?date=) 해석·만들기와 공통 탐색(이전·다음 달, 키보드 이동),
                  useCalendar = 상태(고른 날짜) + 바꾸는 함수(history.replaceState), CalendarGrid(월 캘린더, role=grid, roving tabindex),
                  CalendarHeader(달 이동 + 오늘 아이콘 TodayButton), DaySummary(하루 요약)
                  records/schema/ = 필드 빌더(fieldKinds)와 타입별 스키마, RecordEntry 판별 유니온
                  records/api/ = 기록 저장·조회의 유일한 입구(recordStore)와 DB 줄 변환(recordMapper)
                  records/hooks/ = TanStack Query 훅과 쿼리 키(recordKeys)
                  records/form/ = 작성 폼(RecordForm), 필드 종류별 입력칸(FieldInput), 입력값 변환
                  records/entry/ = 새 기록 진입점(모바일 스피드 다이얼, 사이드바 "새 기록" 메뉴, 메뉴 목록)
                  records/ui/ = 타입별 아이콘·색(recordTypeStyle), 목록·카드 표시 규칙(recordPresentation)
                  records/overview/ = 기록 탭 첫 화면(이번 달 카드, 최근 기록)
                  records/detail/ = 기록 상세(RecordDetail), 수정·삭제 동작(RecordActions), 수정 화면(RecordEditForm)
                  records/type/ = 타입 상세(달 이동, 타입별 요약 카드 registry, 목록)
                  records/sample/ = 체험하기 예시 기록(오늘 기준 최근 2주, 순수 함수) + 넣기(addSampleRecords)
  lib/supabase/   Supabase 클라이언트 (client.ts = 브라우저용, server.ts = 서버용, admin.ts = secret 키 관리자용·서버 전용), database.types.ts = DB 타입(자동 생성, 직접 수정 금지)
  lib/sentry/     Sentry 공통 설정(sentryOptions: 켜는 조건, 개인 데이터 수집 끔). instrumentation(-client).ts와 app/global-error.tsx가 쓴다
  lib/db/         Dexie 스키마와 마이그레이션 (예정)
tests/integration/  진짜 Supabase에 붙는 통합 테스트(RLS 격리 등). npm run test:integration, CI가 로컬 Supabase(Docker)를 띄워 돌린다
tests/e2e/          Playwright E2E (npm run test:e2e). CI가 같은 로컬 Supabase에 붙인 빌드로 실제 브라우저 흐름을 돌린다
                    visual.spec.ts = 화면 비교, 기준 이미지는 visual.spec.ts-snapshots/ (CI 리눅스에서만 만든다:
                    화면을 바꾸면 CI가 실패하며 visual-snapshots 아티팩트를 올린다 → 내려받아 확인 → 바뀐 이미지만 커밋)
supabase/migrations/ DB 구조(SQL). 새 파일은 npm run db:new, 적용은 npm run db:push, 타입은 npm run db:types
tokens/tokens.json   디자인 토큰의 유일한 원본. 바꾸면 src/app/globals.css를 맞춘다
design/              시안 참고용. 앱 코드에서 import하지 않고 ESLint 대상도 아님 (README.md 참고)
private/             개인 기록(면접 질문, 트러블슈팅·설계 결정 초안, learning/ = 학습 노트). .gitignore 대상
public/              정적 파일
```

- 경로 별칭: `@/*` → `src/*` (tsconfig `paths`)

## 4. 규칙

### 네이밍

- 컴포넌트: `PascalCase.tsx` (예: `RecordCard.tsx`)
- 훅: `useCamelCase.ts` (예: `useRecordFilter.ts`)
- 유틸·함수: `camelCase`, 동사로 시작 (예: `toFilterQuery`)
- 타입: `PascalCase`, `I` 접두사 쓰지 않음 (예: `RecordEntry`)
- 상수: `UPPER_SNAKE_CASE`
- 불리언: `is`/`has`/`can` 접두사 (예: `isSynced`)
- 테스트 파일: 대상 파일 옆에 `*.test.ts(x)`

### 컴포넌트 작성

- 서버 컴포넌트가 기본. 브라우저 API·IndexedDB·상태가 필요할 때만 `'use client'`를 붙이고, 그 이유를 설명할 수 있어야 한다.
- 기록 화면은 오프라인에서도 동작해야 하므로 클라이언트 컴포넌트 중심이다.
- 한 컴포넌트는 한 가지 역할. 데이터 조회와 표시는 분리한다 (훅이 조회, 컴포넌트는 표시).
- props는 필요한 것만 받는다. 기록 객체 전체를 넘기기보다 필요한 값만 넘기는 걸 우선 고려한다.
- 공통 컴포넌트는 `shared/`에 둔다.
- 타입별 분기(`if type === 'expense'`)를 컴포넌트에 흩뿌리지 않는다. 타입별 차이는 스키마 정의에 둔다.

### 모바일·PC 분기

- 레이아웃 차이(하단 탭/사이드바, 좌우 배치)는 Tailwind 반응형 클래스(CSS)로만 처리한다. `useMediaQuery`로 다른 컴포넌트를 렌더하지 않는다 (하이드레이션 불일치).
- 기기 능력 분기(카메라 촬영, 스와이프)는 마운트 후 훅에서 판단하고, 판단 전에는 해당 UI를 숨긴 상태로 시작한다.
- 스와이프는 지름길일 뿐이다. 모든 조작은 버튼과 키보드로도 가능해야 한다 (캘린더: 방향키·PageUp/PageDown, roving tabindex, `role="grid"`).
- hover에만 기대는 UI 금지. 터치 영역 44px은 모든 구간에 적용한다.
- 공유·새로고침·뒤로 가기에 살아남아야 하는 상태는 URL에 둔다 (`?date=`, `/records/[id]`, 검색어·필터). 화면 안에서만 쓰는 상태는 Zustand.
- 기록 상세는 `/records/[id]` 경로 하나. 모바일은 전체 화면, PC는 목록 옆 패널 (layout으로 처리). 작성 폼도 모바일 전체 화면, PC 오른쪽 패널.
- 시트는 컴포넌트 하나(Radix Dialog 기반)에 모바일 바텀시트 / PC 오른쪽 패널 변형.
- Enter 처리(채팅·검색)는 `e.nativeEvent.isComposing`이면 무시한다 (한글 조합 중복 전송).
- 모바일: `100dvh`, 하단 고정 요소에 `env(safe-area-inset-bottom)`, 입력 중 하단 탭·스피드 다이얼 숨김, 숫자 입력은 `inputMode="numeric"`.

### 코드 스타일

- ESLint + Prettier 설정을 따른다. 규칙을 끄는 주석(`eslint-disable`)은 이유를 함께 적는다.
- `any` 금지. 불가피하면 `unknown` 후 좁히기.
- 주석은 "무엇을"이 아니라 "왜"를 쓴다.
- 매직 넘버는 이름 있는 상수로.
- 커밋 메시지: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` 접두사 + 한국어 설명.

## 5. 워크플로우

### 5-1. 구현 방식과 학습 노트 (기본값, 가장 중요)

Claude가 기능을 직접 구현한다. 사용자는 구현된 코드의 주석과 학습 노트로 따로 공부한다. (2026-10-21, 학습 모드에서 바꿈)

1. **시작 전 합의**: 무엇을 입력받아 무엇을 내놓는지, 어느 파일에 들어갈지 3~5줄로 정리하고, 사용자가 정해야 하는 결정(라이브러리 추가, 데이터 모양, 사용자에게 보이는 동작)만 추천안과 함께 묻는다. 관례적 기본값이 있는 것은 정해서 진행하고 알린다.
2. **구현**: 한 번에 한 기능, 작은 단위로. 로직은 테스트를 먼저 또는 함께 쓴다.
3. **주석**: 모든 파일에 "왜" 주석을 단다. 설계 이유, 고르지 않은 대안과 이유, 빠지기 쉬운 함정(예: toISOString의 UTC 밀림, in 연산자의 상속 키). 코드가 하는 일을 다시 말하는 주석과 TODO 안내 주석은 남기지 않는다.
4. **학습 노트**: `private/learning/`에 Claude가 직접 쓰고, 기능 PR 안에서 함께 갱신한다 (`private/`라 커밋되지 않는다).
   - `00-roadmap.md`: 전체 단계(step1~4)와 완료 여부, 지금 진행 중인 단계, 다음 할 일
   - `NN-기능명.md` (기능마다 하나): 무엇을·왜, 데이터 흐름, 핵심 개념(처음 보는 문법·API는 짧은 예시와 함께), 함정, 관련 파일과 PR, 면접 질문(`private/interview-questions.md` 항목과 연결), 직접 해 볼 것
5. **마무리 응답**: 무엇을 만들었는지, 확인한 것(테스트·빌드), 확인하지 못한 것, 해당 학습 노트 파일을 알린다.

설정 파일(eslint, prettier, tsconfig 등)은 각 옵션을 왜 켰는지 주석이나 학습 노트에 남긴다.

### 5-2. 작업 절차

1. **작업 전 확인**: 관련 파일과 이 문서의 규칙, 기획서의 해당 범위를 확인한다. 범위 밖 작업이면 먼저 알린다.
2. **구현**: 5-1 방식으로 진행한다. 한 번에 한 기능, 작은 단위로.
3. **테스트**: 로직(스키마 변환, 필터, 동기화, AI 응답 파싱, Schedule 계산, 날짜 처리)은 단위 테스트를 먼저 또는 함께 작성한다.
   UI는 핵심 흐름만 컴포넌트 테스트·E2E로 검증하고, 화면이 바뀌면 화면 비교 스냅샷을 확인한다.
4. **검증**: 커밋 전에 `lint`, `typecheck`, `test`가 모두 통과해야 한다.
   성능 관련 작업은 **변경 전 수치를 먼저 측정**하고, 전후 수치를 `docs/performance.md`에 기록한다.
5. **기록**: 설계 결정(대안과 버린 이유)은 초안을 `private/decisions/YYYY-MM-DD-제목.md`에 짧게 남긴다. 면접 답변의 근거가 된다. 트러블슈팅처럼 막바지에 좋은 것만 골라 `docs/decisions/`로 옮겨 공개한다.

### 5-3. 포트폴리오 기록

작업이 끝날 때 아래에 해당하면 Claude가 초안을 직접 써 두고 마무리 응답에서 알린다. 따로 묻지 않는다.
초안은 확인한 사실만 쓰고, 사용자가 읽고 자기 말로 고친다.

- **트러블슈팅**: 30분 이상 막혔거나 원인이 예상과 달랐던 문제는 초안을 `private/troubleshooting/YYYY-MM-DD-제목.md`에
  문제 → 원인 → 해결 → 결과(가능하면 수치)로 남기고, 오류 메시지, 원인을 찾은 방법, 관련 PR·커밋 번호를 붙인다.
  프로젝트 막바지에 좋은 소재만 골라 `docs/troubleshooting/`으로 옮겨 공개하고, 옮길 때 실제 프로젝트 주소·키가 없는지 확인한다.
- **설계 결정**: 대안과 버린 이유가 분명한 결정은 초안을 `private/decisions/YYYY-MM-DD-제목.md`에 상황 → 결정 → 대안과 버린 이유 → 결과 → 감수한 것으로 남긴다 (5-2의 5번).
- **전후 캡처**: 화면이나 성능을 바꾸기 전에 현재 상태를 먼저 캡처한다. `docs/assets/`에 `기능명-before.png`, `기능명-after.png`로 저장한다.
- **측정 조건**: Lighthouse 수치에는 모바일 모드, 시크릿 창, 측정 도구를 같이 적는다. 직접 측정하지 않은 수치는 쓰지 않는다.
- **단계 마무리**: step이 끝나면 테스트 개수, CI 통과 기록, Lighthouse 점수를 `docs/milestones.md`에 한 번 정리한다.

### 5-4. 면접 예상 질문 모으기

- 작업 중 면접에서 물어볼 만한 내용(설계 결정, 트레이드오프, 트러블슈팅, 성능 수치)이 나오면, 작업이 끝날 때 `private/interview-questions.md`에 한 번에 추가한다. 따로 묻지 않고 써도 된다.
- 형식: `## YYYY-MM-DD 작업명` 아래에 `Q: 질문` / `답 핵심: 2~3줄, 실제로 한 것 기준` / `근거: 파일 경로·커밋`.
- 같은 질문이 이미 있으면 새로 쓰지 않고 기존 항목을 보강한다.
- 답은 초안이다. 사용자가 자기 말로 고쳐 쓴다.
- 이 파일과 `private/` 폴더는 `.gitignore` 대상이다. 커밋·PR·README에 내용을 넣지 않는다.

## 6. 모듈별 규칙

> 모듈이 구체화된 후 작성한다. 기능·폴더별 책임과 구현 원칙을 여기에 추가한다.

<!-- 예상 모듈: auth(로그인·체험), records(기록 CRUD·스키마), calendar(홈), search(검색·필터), chat(AI 어댑터·채팅),
     sync(outbox 동기화), schedule(루틴·고정지출·측정 주기), body(체형·사진), push(알림), report(보고서), backup(백업), settings -->
