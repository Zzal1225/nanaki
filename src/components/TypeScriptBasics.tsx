// TypeScript 기초 학습: 기본 타입들
import { useState } from 'react';

function TypeScriptBasics() {
  // 1. 기본 타입들 (타입 추론)
  const [message, setMessage] = useState('안녕하세요'); // string 타입으로 추론
  const [age, setAge] = useState(25); // number 타입으로 추론
  const [isActive, setIsActive] = useState(true); // boolean 타입으로 추론

  // 2. 명시적 타입 지정
  const [score, setScore] = useState<number>(0); // 명시적으로 number 타입
  const [tags, setTags] = useState<string[]>([]); // 문자열 배열 타입

  // 3. 함수의 매개변수와 반환 타입
  const calculateTotal = (price: number, quantity: number): number => {
    return price * quantity;
  };

  const formatMessage = (name: string, age: number): string => {
    return `안녕하세요, ${name}님! ${age}세이시네요.`;
  };

  // 4. 이벤트 핸들러 (타입 지정)
  const handleMessageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setMessage(event.target.value);
  };

  const handleAgeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newAge = parseInt(event.target.value) || 0; // 문자열을 숫자로 변환
    setAge(newAge);
  };

  const addTag = (): void => {
    const newTag = `태그${tags.length + 1}`;
    setTags([...tags, newTag]); // 배열에 새 항목 추가
  };

  return (
    <div className='p-6 bg-indigo-50 border border-indigo-200 rounded-lg'>
      <h3 className='text-lg font-semibold text-indigo-800 mb-4'>
        TypeScript 기본 타입 실습
      </h3>

      {/* 문자열(string) 타입 */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-indigo-700 mb-2'>
          메시지 (string 타입):
        </label>
        <input
          type='text'
          value={message}
          onChange={handleMessageChange}
          className='w-full px-3 py-2 border border-indigo-300 rounded'
        />
        <p className='text-sm text-indigo-600 mt-1'>입력된 값: {message}</p>
      </div>

      {/* 숫자(number) 타입 */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-indigo-700 mb-2'>
          나이 (number 타입):
        </label>
        <input
          type='number'
          value={age}
          onChange={handleAgeChange}
          className='w-full px-3 py-2 border border-indigo-300 rounded'
        />
        <p className='text-sm text-indigo-600 mt-1'>입력된 값: {age}</p>
      </div>

      {/* 불린(boolean) 타입 */}
      <div className='mb-4'>
        <label className='flex items-center text-sm font-medium text-indigo-700'>
          <input
            type='checkbox'
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className='mr-2'
          />
          활성화 상태 (boolean 타입): {isActive ? 'true' : 'false'}
        </label>
      </div>

      {/* 배열(array) 타입 */}
      <div className='mb-4'>
        <div className='flex items-center gap-2 mb-2'>
          <span className='text-sm font-medium text-indigo-700'>
            태그 목록 (string[] 타입):
          </span>
          <button
            onClick={addTag}
            className='px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600'
          >
            태그 추가
          </button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {tags.map((tag, index) => (
            <span
              key={index}
              className='px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded'
            >
              {tag}
            </span>
          ))}
          {tags.length === 0 && (
            <span className='text-sm text-gray-500'>태그가 없습니다</span>
          )}
        </div>
      </div>

      {/* 함수 실행 결과 */}
      <div className='p-3 bg-indigo-100 rounded'>
        <p className='text-indigo-800 font-semibold mb-2'>함수 실행 결과:</p>
        <p className='text-indigo-700'>
          • 계산 결과: {calculateTotal(1000, 3)} (가격 1000원 × 수량 3개)
        </p>
        <p className='text-indigo-700'>
          • 포맷된 메시지: {formatMessage(message || '이름없음', age)}
        </p>
      </div>
    </div>
  );
}

export default TypeScriptBasics;
