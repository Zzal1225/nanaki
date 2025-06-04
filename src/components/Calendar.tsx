import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';

// 임시 스티커 데이터 (나중에 Firestore로 대체)
const mockStickerData: Record<string, { positive: number; negative: number }> =
  {
    '2025-06-01': { positive: 2, negative: 1 },
    '2025-06-02': { positive: 1, negative: 0 },
    '2025-06-03': { positive: 3, negative: 2 },
    '2025-06-04': { positive: 2, negative: 0 }, // 오늘
  };

const Calendar = () => {
  const [user] = useAuthState(auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 현재 월의 첫째 날과 마지막 날
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 캘린더 시작 요일 (월요일 = 1, 일요일 = 0)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 월요일을 0으로 만들기

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0];

  // 이전/다음 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (date: string) => {
    setSelectedDate(selectedDate === date ? null : date);
  };

  // 날짜별 스티커 정보 가져오기
  const getDateStickers = (date: string) => {
    return mockStickerData[date] || { positive: 0, negative: 0 };
  };

  // 캘린더 날짜 배열 생성
  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = lastDay.getDate();

    // 이전 달 빈 칸들
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 현재 달 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(
        2,
        '0'
      )}-${String(day).padStart(2, '0')}`;
      days.push(dateString);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  if (!user) {
    return (
      <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
        <p className='text-gray-500 dark:text-gray-400 text-center'>
          캘린더를 보려면 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
      {/* 캘린더 헤더 */}
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
          📅 습관 달력
        </h3>

        <div className='flex items-center gap-4'>
          <button
            onClick={goToPreviousMonth}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <svg
              className='w-5 h-5 text-gray-600 dark:text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>

          <h4 className='text-lg font-medium text-gray-900 dark:text-white min-w-[120px] text-center'>
            {year}년 {month + 1}월
          </h4>

          <button
            onClick={goToNextMonth}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <svg
              className='w-5 h-5 text-gray-600 dark:text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className='grid grid-cols-7 gap-1 mb-2'>
        {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
          <div
            key={day}
            className='h-8 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400'
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className='grid grid-cols-7 gap-1'>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={index} className='h-12' />;
          }

          const stickers = getDateStickers(date);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const hasActivity = stickers.positive > 0 || stickers.negative > 0;

          return (
            <button
              key={date}
              onClick={() => handleDateClick(date)}
              className={`
                h-12 flex flex-col items-center justify-center rounded-lg text-sm transition-all duration-200 relative
                ${
                  isToday
                    ? 'bg-blue-500 text-white font-bold'
                    : isSelected
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : hasActivity
                    ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                text-gray-900 dark:text-white
              `}
            >
              <span className='text-xs'>{new Date(date).getDate()}</span>

              {/* 스티커 인디케이터 */}
              {hasActivity && !isToday && (
                <div className='flex gap-1 mt-0.5'>
                  {stickers.positive > 0 && (
                    <div className='w-1 h-1 bg-blue-500 rounded-full' />
                  )}
                  {stickers.negative > 0 && (
                    <div className='w-1 h-1 bg-red-500 rounded-full' />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜 정보 */}
      {selectedDate && (
        <div className='mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
          <h4 className='font-medium text-gray-900 dark:text-white mb-3'>
            {new Date(selectedDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h4>

          <div className='grid grid-cols-2 gap-4'>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-500'>
                {getDateStickers(selectedDate).positive}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400'>
                좋은 습관
              </div>
            </div>

            <div className='text-center'>
              <div className='text-xl font-bold text-red-500'>
                {getDateStickers(selectedDate).negative}
              </div>
              <div className='text-xs text-gray-600 dark:text-gray-400'>
                나쁜 습관
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className='mt-6 flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400'>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-blue-500 rounded-full' />
          <span>좋은 습관</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-red-500 rounded-full' />
          <span>나쁜 습관</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-blue-500 rounded' />
          <span>오늘</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
