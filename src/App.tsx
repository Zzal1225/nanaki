import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

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

          {/* 개발 상태 표시 */}
          <div className='inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium'>
            🚧 Phase 1: 개발 환경 구축 완료!
          </div>
        </header>

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
                Node.js v22 업그레이드 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-green-500'>✅</span>
              <span className='text-gray-700 dark:text-gray-300'>
                Tailwind CSS 설정 완료
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-blue-500'>🔄</span>
              <span className='text-gray-700 dark:text-gray-300'>
                Firebase 연동 준비 중
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
