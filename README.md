# nanaki - 토탈 다이어리 PWA

> 📱 **개인 맞춤형 습관 추적 플랫폼**  
> 캘린더 기반의 멀티 데이터 추적으로 더 나은 자신을 만들어가세요

[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FF6F00?style=flat&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

## 🎯 프로젝트 개요

**nanaki**는 단순한 캘린더를 넘어선 종합적인 개인 데이터 관리 플랫폼입니다.

### 핵심 기능

- 🏷️ **스티커 시스템**: 좋은 습관(파란색) vs 나쁜 습관(빨간색) 시각적 추적
- ⚖️ **몸무게 관리**: 체중 변화 기록 및 추이 분석
- 💰 **가계부**: 수입/지출 관리 및 카테고리별 분석
- 📊 **통계 대시보드**: 습관 패턴 및 목표 달성률 시각화
- 🎯 **목표 설정**: 개인 맞춤형 목표 설정 및 추적

### 기술적 특징

- **Progressive Web App**: 네이티브 앱과 같은 사용자 경험
- **오프라인 지원**: 네트워크 없이도 데이터 기록 가능
- **실시간 동기화**: Firebase를 통한 멀티 디바이스 동기화
- **반응형 디자인**: 모바일 퍼스트 UI/UX

## 🛠️ 기술 스택

### Frontend

- **Core**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + HeadlessUI
- **State Management**: Zustand + TanStack Query
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod Validation

### Backend & Infrastructure

- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Hosting**: Vercel
- **PWA**: Workbox Service Worker

### Development Tools

- **Code Quality**: ESLint + Prettier + Husky
- **Testing**: Vitest + React Testing Library
- **Bundling**: Vite with optimized PWA plugins
- **Version Control**: Git with Conventional Commits

## 🚀 Quick Start

```bash
# 프로젝트 클론
git clone https://github.com/Zzal1225/nanaki.git
cd nanaki

# 의존성 설치
npm install

# 환경변수 설정 (Firebase 설정 시 추가 예정)
# cp .env.example .env.local
# Firebase 설정 정보를 .env.local에 추가

# 개발 서버 시작
npm run dev
```

## 📂 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트 (Button, Input 등)
│   ├── calendar/       # 캘린더 관련 컴포넌트
│   ├── habits/         # 습관 추적 관련 컴포넌트
│   ├── auth/           # 인증 관련 컴포넌트
│   └── LearningPage.tsx # React+TypeScript 학습 컴포넌트 모음
├── pages/              # 페이지 컴포넌트
├── hooks/              # 커스텀 훅
├── store/              # Zustand 상태 관리
├── services/           # Firebase 서비스 로직
├── utils/              # 유틸리티 함수
├── types/              # TypeScript 타입 정의
└── styles/             # 글로벌 스타일
```

## 📚 개발 학습 과정

이 프로젝트는 주니어 프론트엔드 개발자의 실무 스킬 향상을 위한 학습 과정을 포함합니다.

### 완료된 학습 단계

#### 1. React 기초 (4단계)

- ✅ **컴포넌트**: 함수형 컴포넌트와 JSX 기본 문법
- ✅ **Props**: 부모-자식 컴포넌트 간 데이터 전달
- ✅ **State**: useState를 활용한 상태 관리
- ✅ **TypeScript 기본**: 기본 타입 정의와 Props 타입 지정

#### 2. TypeScript 심화 (3단계)

- ✅ **Interface & Type**: 객체 타입 정의와 차이점 이해
- ✅ **Generic**: 재사용 가능한 타입 정의 방법
- ✅ **Union Type & Optional**: 유연한 타입 시스템 활용

#### 3. React 심화 (3단계)

- ✅ **useEffect Hook**: 생명주기와 부수효과 관리
- ✅ **Custom Hook**: 로직 재사용을 위한 훅 분리
- ✅ **React Patterns**: 실무에서 자주 사용되는 패턴들

### 학습 컴포넌트 확인

프로젝트 내에서 학습한 내용들을 확인하려면:

```bash
# 개발 서버 실행 후
npm run dev

# 앱 우상단의 "학습 모드" 토글 버튼 클릭
```

`LearningPage.tsx`에서 모든 학습 컴포넌트들을 한 번에 확인할 수 있습니다.

## 🔧 개발 프로세스

### Git Workflow

- **main**: 프로덕션 브랜치
- **develop**: 개발 브랜치
- **feature/\***: 기능별 브랜치

### 커밋 컨벤션

```bash
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 업데이트
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 과정 또는 보조 도구 변경
```

## 🎨 디자인 시스템

### 색상 팔레트

- **Primary**: Blue-500 (좋은 습관 스티커)
- **Destructive**: Red-500 (나쁜 습관 스티커)
- **Background**: Neutral-50/900 (라이트/다크 모드)

### 반응형 브레이크포인트

- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

## 📈 개발 로드맵

### Phase 1: 기초 구축 ✅

- [x] 프로젝트 설정 및 Git 초기화
- [x] Node.js v22 업그레이드 및 환경 설정
- [x] 기본 의존성 설치 및 개발 서버 테스트
- [ ] Firebase 연동 및 인증 구현
- [ ] 기본 캘린더 UI 구현
- [ ] 스티커 시스템 MVP

### Phase 2: 핵심 기능 (예정)

- [ ] 몸무게 기록 시스템
- [ ] 가계부 기능
- [ ] PWA 설정 및 오프라인 지원

### Phase 3: 고급 기능 (예정)

- [ ] 통계 대시보드
- [ ] 목표 설정 시스템
- [ ] 알림 및 성취 시스템

## 🚧 현재 진행상황

**최근 업데이트**: React + TypeScript 학습 완료, 프로젝트 구조 정리 완료  
**학습 성과**:

- 실무에서 자주 사용되는 React + TypeScript 패턴 10가지 학습
- 컴포넌트, Hook, 타입 시스템에 대한 실무 지식 습득
- 학습 내용과 실제 프로젝트 코드의 명확한 분리

**다음 단계**: Firebase 연동 및 인증 시스템 구현

## 🎓 학습 노트

프로젝트 진행 중 습득한 주요 개념들:

- **Union Type vs Generic**: 실무에서는 Generic보다 Union Type이 더 자주 사용
- **useEffect Dependency Array**: 의존성 배열의 중요성과 cleanup 함수
- **Custom Hook 규칙**: 함수형 컴포넌트나 다른 Custom Hook에서만 사용 가능
- **React Patterns**: Compound Component, Render Props, Higher-Order Component 등

---

<div align="center">

**🌟 Made with passion for better habits 🌟**

</div>
