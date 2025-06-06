// React 기초 학습: useState Hook으로 상태 관리하기
import { useState } from 'react';

function Counter() {
  // useState Hook: [현재값, 업데이트함수] = useState(초기값)
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  // 이벤트 핸들러 함수들
  const handleIncrement = () => {
    setCount(count + 1); // 카운트 증가
  };

  const handleDecrement = () => {
    setCount(count - 1); // 카운트 감소
  };

  const handleReset = () => {
    setCount(0); // 카운트 리셋
    setName(''); // 이름도 리셋
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value); // 입력값으로 이름 업데이트
  };

  return (
    <div className='p-6 bg-purple-50 border border-purple-200 rounded-lg'>
      <h3 className='text-lg font-semibold text-purple-800 mb-4'>
        상태 관리 실습 (useState Hook)
      </h3>

      {/* 카운터 표시 */}
      <div className='mb-4'>
        <p className='text-xl font-bold text-purple-700'>카운트: {count}</p>
      </div>

      {/* 카운터 버튼들 */}
      <div className='mb-6 space-x-3'>
        <button
          onClick={handleIncrement}
          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
        >
          증가 (+1)
        </button>

        <button
          onClick={handleDecrement}
          className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
        >
          감소 (-1)
        </button>

        <button
          onClick={handleReset}
          className='px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600'
        >
          리셋
        </button>
      </div>

      {/* 입력 필드 */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-purple-700 mb-2'>
          이름을 입력해보세요:
        </label>
        <input
          type='text'
          value={name}
          onChange={handleNameChange}
          placeholder='이름을 입력하세요'
          className='w-full px-3 py-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500'
        />
      </div>

      {/* 상태 표시 */}
      <div className='p-3 bg-purple-100 rounded'>
        <p className='text-purple-800'>
          <strong>현재 상태:</strong>
        </p>
        <p className='text-purple-700'>• 카운트: {count}</p>
        <p className='text-purple-700'>
          • 이름: {name || '(입력된 이름이 없습니다)'}
        </p>
        {name && (
          <p className='text-purple-700 font-semibold'>
            안녕하세요, {name}님! 카운트를 {count}번 변경했네요!
          </p>
        )}
      </div>
    </div>
  );
}

export default Counter;
