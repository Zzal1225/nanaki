import { useState } from 'react';

// ========================================
// TypeScript 심화 2단계: Generic 쉽게 이해하기
// ========================================

// 📦 1. Generic = 택배 상자 (어떤 타입이든 담을 수 있음)
interface Box<T> {
  content: T;
  label: string;
}

// 🍎 사과 상자
const appleBox: Box<string> = {
  content: '사과 5개',
  label: '과일 상자',
};

// 📚 책 상자
const bookBox: Box<number> = {
  content: 3,
  label: '책 개수',
};

// 📋 2. Generic 배열 (여러 개 담기)
interface Container<T> {
  items: T[];
  name: string;
  addItem: (item: T) => void;
}

// 🎵 3. Generic 함수 - 첫 번째 요소 가져오기
function getFirst<T>(list: T[]): T | undefined {
  return list.length > 0 ? list[0] : undefined;
}

// 🔄 4. Generic 함수 - 두 값 바꾸기
function swap<T>(a: T, b: T): [T, T] {
  return [b, a];
}

// 📊 5. API 응답용 Generic
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// 👤 사용자 정보
interface User {
  name: string;
  age: number;
}

// 📝 게시물 정보
interface Post {
  title: string;
  content: string;
}

const TypeScriptGeneric = () => {
  // 🍎 과일 컨테이너
  const [fruitContainer, setFruitContainer] = useState<Container<string>>({
    items: ['사과', '바나나'],
    name: '과일 저장소',
    addItem: () => {}, // 아래에서 구현
  });

  // 🔢 숫자 컨테이너
  const [numberContainer, setNumberContainer] = useState<Container<number>>({
    items: [1, 2, 3],
    name: '숫자 저장소',
    addItem: () => {}, // 아래에서 구현
  });

  // 📊 API 응답 예시들
  const [userResponse, setUserResponse] = useState<ApiResponse<User>>({
    success: true,
    data: { name: '김개발', age: 25 },
    message: '사용자 조회 성공',
  });

  const [postResponse, setPostResponse] = useState<ApiResponse<Post>>({
    success: true,
    data: { title: '첫 번째 글', content: '안녕하세요!' },
    message: '게시물 조회 성공',
  });

  // 🍎 과일 추가 함수
  const addFruit = () => {
    const fruits = ['딸기', '오렌지', '포도', '키위'];
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];

    setFruitContainer((prev) => ({
      ...prev,
      items: [...prev.items, randomFruit],
    }));
  };

  // 🔢 숫자 추가 함수
  const addNumber = () => {
    const randomNumber = Math.floor(Math.random() * 100) + 1;

    setNumberContainer((prev) => ({
      ...prev,
      items: [...prev.items, randomNumber],
    }));
  };

  // 🔄 Generic 함수 테스트
  const testGenericFunctions = () => {
    // 문자열 배열에서 첫 번째 요소
    const firstFruit = getFirst(fruitContainer.items);

    // 숫자 배열에서 첫 번째 요소
    const firstNumber = getFirst(numberContainer.items);

    // 두 값 바꾸기
    const [swapped1, swapped2] = swap('안녕', '하세요');

    alert(`
첫 번째 과일: ${firstFruit}
첫 번째 숫자: ${firstNumber}
바뀐 문자: ${swapped1}, ${swapped2}
    `);
  };

  // 🎲 API 응답 바꾸기
  const changeApiResponse = () => {
    setUserResponse((prev) => ({
      ...prev,
      data: { name: '이프론트', age: 30 },
    }));

    setPostResponse((prev) => ({
      ...prev,
      data: { title: '두 번째 글', content: 'Generic 공부 중!' },
    }));
  };

  return (
    <div className='space-y-6 p-6 bg-white border border-gray-200 rounded-lg'>
      <h3 className='text-xl font-bold text-gray-800 mb-4'>
        TypeScript 심화 2단계: Generic 쉽게 이해하기
      </h3>

      {/* 개념 설명 */}
      <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
        <h4 className='font-bold text-blue-800 mb-3'>💡 Generic이란?</h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>📦 택배 상자 비유:</strong> 상자는 똑같지만, 안에 들어갈
            물건은 다를 수 있음
          </p>
          <p>
            <strong>🔧 Template:</strong> 빈 칸이 있는 템플릿에 나중에 타입을
            넣어서 사용
          </p>
          <p>
            <strong>♻️ 재사용:</strong> 한 번 만들어두면 여러 타입에서 사용 가능
          </p>
        </div>
        <div className='bg-white p-3 rounded mt-3 text-xs font-mono'>
          <pre>{`// Generic 기본 문법
interface Box<T> {  // T는 나중에 정할 타입
  content: T;
}

// 사용할 때 타입 지정
const stringBox: Box<string> = { content: "문자열" };
const numberBox: Box<number> = { content: 42 };`}</pre>
        </div>
      </div>

      {/* 📦 1. Generic Interface 실습 */}
      <div className='bg-green-50 p-4 rounded-md'>
        <h4 className='font-semibold text-green-800 mb-3'>
          📦 1. Generic Interface - 택배 상자
        </h4>
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>
              🍎 사과 상자 (Box&lt;string&gt;)
            </h5>
            <p className='text-sm'>내용물: {appleBox.content}</p>
            <p className='text-sm'>라벨: {appleBox.label}</p>
          </div>
          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>📚 책 상자 (Box&lt;number&gt;)</h5>
            <p className='text-sm'>내용물: {bookBox.content}권</p>
            <p className='text-sm'>라벨: {bookBox.label}</p>
          </div>
        </div>
        <div className='mt-3 text-xs text-green-600'>
          <p>💬 같은 Box 인터페이스지만 다른 타입의 데이터를 담을 수 있어요!</p>
        </div>
      </div>

      {/* 📋 2. Generic 배열 실습 */}
      <div className='bg-purple-50 p-4 rounded-md'>
        <h4 className='font-semibold text-purple-800 mb-3'>
          📋 2. Generic 배열 - 컨테이너
        </h4>
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>
              🍎 과일 컨테이너 (Container&lt;string&gt;)
            </h5>
            <p className='text-sm mb-2'>{fruitContainer.name}</p>
            <div className='flex flex-wrap gap-1 mb-2'>
              {fruitContainer.items.map((fruit, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-green-100 rounded text-xs'
                >
                  {fruit}
                </span>
              ))}
            </div>
            <button
              onClick={addFruit}
              className='bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600'
            >
              과일 추가
            </button>
          </div>

          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>
              🔢 숫자 컨테이너 (Container&lt;number&gt;)
            </h5>
            <p className='text-sm mb-2'>{numberContainer.name}</p>
            <div className='flex flex-wrap gap-1 mb-2'>
              {numberContainer.items.map((number, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-blue-100 rounded text-xs'
                >
                  {number}
                </span>
              ))}
            </div>
            <button
              onClick={addNumber}
              className='bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600'
            >
              숫자 추가
            </button>
          </div>
        </div>
        <div className='mt-3 text-xs text-purple-600'>
          <p>💬 같은 Container 구조지만 문자열과 숫자를 각각 저장해요!</p>
        </div>
      </div>

      {/* 🔄 3. Generic 함수 실습 */}
      <div className='bg-orange-50 p-4 rounded-md'>
        <h4 className='font-semibold text-orange-800 mb-3'>
          🔄 3. Generic 함수
        </h4>
        <div className='bg-white p-4 rounded border mb-3'>
          <div className='space-y-2 text-sm'>
            <p>
              <strong>getFirst&lt;T&gt;():</strong> 배열의 첫 번째 요소 가져오기
            </p>
            <p>
              <strong>swap&lt;T&gt;():</strong> 두 값의 위치 바꾸기
            </p>
          </div>
        </div>
        <button
          onClick={testGenericFunctions}
          className='bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600'
        >
          Generic 함수 테스트
        </button>
        <div className='mt-3 text-xs text-orange-600'>
          <p>💬 하나의 함수로 여러 타입의 데이터를 처리할 수 있어요!</p>
        </div>
      </div>

      {/* 📊 4. API 응답용 Generic */}
      <div className='bg-red-50 p-4 rounded-md'>
        <h4 className='font-semibold text-red-800 mb-3'>
          📊 4. API 응답용 Generic
        </h4>
        <div className='grid md:grid-cols-2 gap-4 mb-3'>
          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>
              👤 사용자 API (ApiResponse&lt;User&gt;)
            </h5>
            <div className='text-sm space-y-1'>
              <p>성공: {userResponse.success ? '✅' : '❌'}</p>
              <p>이름: {userResponse.data.name}</p>
              <p>나이: {userResponse.data.age}세</p>
              <p>메시지: {userResponse.message}</p>
            </div>
          </div>

          <div className='bg-white p-4 rounded border'>
            <h5 className='font-medium mb-2'>
              📝 게시물 API (ApiResponse&lt;Post&gt;)
            </h5>
            <div className='text-sm space-y-1'>
              <p>성공: {postResponse.success ? '✅' : '❌'}</p>
              <p>제목: {postResponse.data.title}</p>
              <p>내용: {postResponse.data.content}</p>
              <p>메시지: {postResponse.message}</p>
            </div>
          </div>
        </div>
        <button
          onClick={changeApiResponse}
          className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600'
        >
          API 응답 변경
        </button>
        <div className='mt-3 text-xs text-red-600'>
          <p>💬 같은 API 구조로 다른 타입의 데이터를 반환할 수 있어요!</p>
        </div>
      </div>

      {/* 코드 예시 */}
      <div className='bg-gray-50 p-4 rounded-md'>
        <h4 className='font-semibold text-gray-800 mb-3'>
          💻 Generic 코드 패턴
        </h4>
        <div className='bg-gray-900 text-green-400 p-3 rounded text-xs font-mono'>
          <pre>{`// 1. Generic Interface
interface Box<T> {
  content: T;
}

// 2. Generic Function
function getFirst<T>(list: T[]): T | undefined {
  return list[0];
}

// 3. Multiple Generics
interface Pair<T, U> {
  first: T;
  second: U;
}

// 4. Generic with Constraints
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(item: T): T {
  console.log(item.length);
  return item;
}`}</pre>
        </div>
      </div>

      {/* 연습 문제 */}
      <div className='bg-yellow-50 p-4 rounded-md'>
        <h4 className='font-semibold text-yellow-800 mb-3'>
          🎯 이해했는지 확인해보기
        </h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>Q1:</strong> Generic은 무엇과 비슷한가요?
          </p>
          <p className='text-yellow-600'>
            A: 택배 상자 (어떤 타입이든 담을 수 있는 템플릿)
          </p>

          <p>
            <strong>Q2:</strong> &lt;T&gt;의 T는 무엇인가요?
          </p>
          <p className='text-yellow-600'>
            A: 나중에 정할 타입을 대신하는 플레이스홀더
          </p>

          <p>
            <strong>Q3:</strong> Generic의 장점은?
          </p>
          <p className='text-yellow-600'>
            A: 재사용 가능, 타입 안전성, 코드 중복 방지
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypeScriptGeneric;
