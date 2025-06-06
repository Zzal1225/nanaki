import { useState } from 'react';
import LearningPage from './components/LearningPage';
import FirebaseTest from './components/FirebaseTest';
import Auth from './components/Auth';
import HabitTracker from './components/HabitTracker';
import Calendar from './components/Calendar';

function App() {
  const [showLearning, setShowLearning] = useState(false);
  const [count, setCount] = useState(0);

  // 학습 페이지를 보여주는 경우
  if (showLearning) {
    return <LearningPage onBackToProject={() => setShowLearning(false)} />;
  }

  // nanaki 프로젝트 메인 페이지
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-8'>
        <header className='text-center mb-12'>
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4'>
            nanaki
          </h1>
          <p className='text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8'>
            📱 토탈 다이어리 PWA - 습관 추적 플랫폼
          </p>

          {/* 학습 페이지 접근 버튼 */}
          <div className='mb-8'>
            <button
              onClick={() => setShowLearning(true)}
              className='bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm mr-4'
            >
              📚 React + TypeScript 학습 페이지
            </button>
            <span className='text-sm text-gray-500'>
              헷갈리면 언제든 학습 내용을 다시 볼 수 있어요!
            </span>
          </div>

          {/* 개발 상태 표시 */}
          <div className='inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium'>
            🚀 nanaki 프로젝트 개발 중
          </div>
        </header>

        {/* Firebase 연결 테스트 */}
        <div className='mb-12'>
          <FirebaseTest />
        </div>

        {/* Firebase Authentication 테스트 */}
        <div className='mb-12'>
          <Auth />
        </div>

        {/* 습관 추적 기능 */}
        <div className='mb-12'>
          <HabitTracker />
        </div>

        {/* 캘린더 */}
        <div className='mb-12'>
          <Calendar />
        </div>

        {/* 기능 미리보기 섹션 */}
        <div className='grid md:grid-cols-3 gap-6 mb-12'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
            <div className='text-3xl mb-3'>🏷️</div>
            <h3 className='text-lg font-semibold mb-2 text-gray-900 dark:text-white'>
              스티커 시스템
            </h3>
            <p className='text-gray-600 dark:text-gray-300 text-sm'>
              좋은 습관과 나쁜 습관을 시각적으로 추적
            </p>
            <div className='mt-4 flex gap-2'>
              <span className='sticker-positive'>독서 30분</span>
              <span className='sticker-negative'>야식</span>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
            <div className='text-3xl mb-3'>⚖️</div>
            <h3 className='text-lg font-semibold mb-2 text-gray-900 dark:text-white'>
              몸무게 관리
            </h3>
            <p className='text-gray-600 dark:text-gray-300 text-sm'>
              체중 변화 기록 및 추이 분석
            </p>
          </div>

          <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
            <div className='text-3xl mb-3'>💰</div>
            <h3 className='text-lg font-semibold mb-2 text-gray-900 dark:text-white'>
              가계부
            </h3>
            <p className='text-gray-600 dark:text-gray-300 text-sm'>
              수입/지출 관리 및 분석
            </p>
          </div>
        </div>

        {/* 개발 진행 상황 */}
        <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8'>
          <h3 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>
            개발 진행상황
          </h3>
          <div className='space-y-3'>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                React + TypeScript 기초 및 심화 학습 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                Firebase Authentication 완료 (이메일/구글 로그인)
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                Firestore 사용자 프로필 저장 기능 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                기본 습관 추적 컴포넌트 구현 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                캘린더 UI 구현 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-blue-500'>🔄</span>
              <span className='text-gray-700 dark:text-gray-300'>
                스티커 시스템 Firestore 연동 진행 중
              </span>
            </div>
          </div>
        </div>

        {/* 테스트 버튼 */}
        <div className='text-center'>
          <button
            className='touch-target bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm'
            onClick={() => setCount((count) => count + 1)}
          >
            개발 테스트: {count}
          </button>
          <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
            Tailwind CSS와 React 상태 관리 테스트
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
