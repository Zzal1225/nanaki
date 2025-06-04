import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';

// 임시 습관 데이터 (나중에 Firestore로 대체)
const defaultHabits = [
  { id: '1', name: '물 8잔 마시기', type: 'positive', icon: '💧' },
  { id: '2', name: '운동 30분', type: 'positive', icon: '🏃‍♂️' },
  { id: '3', name: '독서 30분', type: 'positive', icon: '📚' },
  { id: '4', name: '야식', type: 'negative', icon: '🍟' },
  { id: '5', name: '스마트폰 과사용', type: 'negative', icon: '📱' },
];

const HabitTracker = () => {
  const [user] = useAuthState(auth);
  const [todayStickers, setTodayStickers] = useState<Record<string, boolean>>(
    {}
  );
  const [showAddHabit, setShowAddHabit] = useState(false);

  // 오늘 날짜 문자열 생성
  const today = new Date().toISOString().split('T')[0];

  // 스티커 토글
  const toggleSticker = (habitId: string) => {
    setTodayStickers((prev) => ({
      ...prev,
      [habitId]: !prev[habitId],
    }));
  };

  if (!user) {
    return (
      <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
        <p className='text-gray-500 dark:text-gray-400 text-center'>
          습관 추적을 시작하려면 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
          📅 오늘의 습관 체크
        </h3>
        <div className='text-sm text-gray-500 dark:text-gray-400'>
          {new Date().toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </div>
      </div>

      {/* 습관 목록 */}
      <div className='space-y-3 mb-6'>
        {defaultHabits.map((habit) => {
          const isCompleted = todayStickers[habit.id] || false;
          const isPositive = habit.type === 'positive';

          return (
            <div
              key={habit.id}
              className='flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              <span className='text-2xl'>{habit.icon}</span>

              <div className='flex-1'>
                <span className='text-gray-900 dark:text-white font-medium'>
                  {habit.name}
                </span>
              </div>

              <button
                onClick={() => toggleSticker(habit.id)}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white font-bold transition-all duration-200 transform hover:scale-105
                  ${
                    isCompleted
                      ? isPositive
                        ? 'bg-blue-500 hover:bg-blue-600 shadow-lg'
                        : 'bg-red-500 hover:bg-red-600 shadow-lg'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }
                `}
              >
                {isCompleted ? (isPositive ? '🎉' : '❌') : '+'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 오늘의 성과 요약 */}
      <div className='border-t border-gray-200 dark:border-gray-600 pt-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-blue-500'>
              {
                defaultHabits.filter(
                  (h) => h.type === 'positive' && todayStickers[h.id]
                ).length
              }
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              좋은 습관 완료
            </div>
          </div>

          <div className='text-center'>
            <div className='text-2xl font-bold text-red-500'>
              {
                defaultHabits.filter(
                  (h) => h.type === 'negative' && todayStickers[h.id]
                ).length
              }
            </div>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              나쁜 습관 발생
            </div>
          </div>
        </div>

        <div className='mt-4 text-center'>
          <div className='text-sm text-gray-500 dark:text-gray-400'>
            💡 팁: 좋은 습관은 파란 스티커, 나쁜 습관은 빨간 스티커로 기록해요!
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
