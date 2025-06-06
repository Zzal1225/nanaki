import { useState } from 'react';

// ========================================
// TypeScript 심화 3단계: Union Type & Optional (실무 예시)
// ========================================

// 🔄 1. API 상태 - 실무에서 매일 사용
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 👤 2. 사용자 정보 - Optional 필드들
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // Optional - 있을 수도 없을 수도
  avatar?: string; // Optional
  role: 'admin' | 'user' | 'guest'; // Union Type
}

// 📝 3. 폼 데이터
interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean; // Optional
}

// 🎨 4. UI 테마
type Theme = 'light' | 'dark';
type ButtonSize = 'small' | 'medium' | 'large';

const TypeScriptUnion = () => {
  // API 호출 상태 관리
  const [apiState, setApiState] = useState<LoadingState>('idle');

  // 사용자 데이터 (null일 수 있음)
  const [user, setUser] = useState<User | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    // rememberMe는 Optional이라 생략 가능
  });

  // UI 설정
  const [theme, setTheme] = useState<Theme>('light');
  const [buttonSize, setButtonSize] = useState<ButtonSize>('medium');

  // 실무 함수들
  const handleApiCall = () => {
    setApiState('loading');

    // 가짜 API 호출
    setTimeout(() => {
      const success = Math.random() > 0.3;

      if (success) {
        setApiState('success');
        setUser({
          id: '1',
          name: '김개발',
          email: 'dev@company.com',
          role: 'user',
          // phone, avatar는 Optional이라 생략
        });
      } else {
        setApiState('error');
      }
    }, 2000);
  };

  const addOptionalFields = () => {
    if (user) {
      setUser({
        ...user,
        phone: '010-1234-5678',
        avatar: '/images/avatar.jpg',
      });
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const changeButtonSize = () => {
    const sizes: ButtonSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(buttonSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setButtonSize(sizes[nextIndex]);
  };

  return (
    <div className='space-y-6 p-6 bg-white border border-gray-200 rounded-lg'>
      <h3 className='text-xl font-bold text-gray-800 mb-4'>
        TypeScript 심화 3단계: Union Type & Optional (실무 예시)
      </h3>

      {/* 개념 설명 */}
      <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
        <h4 className='font-bold text-blue-800 mb-3'>
          💡 실무에서 매일 사용하는 문법
        </h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>Union Type (|):</strong> "이것 중 하나만" - API 상태, 사용자
            권한 등
          </p>
          <p>
            <strong>Optional (?):</strong> "있어도 되고 없어도 됨" - 프로필
            사진, 전화번호 등
          </p>
          <p>
            <strong>null/undefined:</strong> "아직 없거나 로딩 중" - 사용자
            데이터, API 응답 등
          </p>
        </div>
        <div className='bg-white p-3 rounded mt-3 text-xs font-mono'>
          <pre>{`// 실무 예시
type Status = 'loading' | 'success' | 'error';  // Union Type
interface User {
  name: string;     // 필수
  phone?: string;   // Optional
}
const user: User | null = null;  // null 허용`}</pre>
        </div>
      </div>

      {/* 🔄 1. API 상태 관리 */}
      <div className='bg-green-50 p-4 rounded-md'>
        <h4 className='font-semibold text-green-800 mb-3'>
          🔄 1. API 상태 관리 (Union Type)
        </h4>
        <div className='bg-white p-4 rounded border mb-3'>
          <p className='text-sm mb-2'>현재 API 상태:</p>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              apiState === 'idle'
                ? 'bg-gray-200'
                : apiState === 'loading'
                ? 'bg-yellow-200'
                : apiState === 'success'
                ? 'bg-green-200'
                : 'bg-red-200'
            }`}
          >
            {apiState}
          </span>
        </div>
        <button
          onClick={handleApiCall}
          disabled={apiState === 'loading'}
          className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50'
        >
          {apiState === 'loading' ? '로딩 중...' : 'API 호출'}
        </button>
        <div className='mt-2 text-xs text-green-600'>
          <p>💬 실무: 'idle' | 'loading' | 'success' | 'error' 매일 사용!</p>
        </div>
      </div>

      {/* 👤 2. 사용자 데이터 (Optional + null) */}
      <div className='bg-purple-50 p-4 rounded-md'>
        <h4 className='font-semibold text-purple-800 mb-3'>
          👤 2. 사용자 데이터 (Optional + null 처리)
        </h4>
        <div className='bg-white p-4 rounded border mb-3'>
          {user ? (
            <div className='space-y-1 text-sm'>
              <p>
                <strong>이름:</strong> {user.name}
              </p>
              <p>
                <strong>이메일:</strong> {user.email}
              </p>
              <p>
                <strong>권한:</strong> {user.role}
              </p>
              <p>
                <strong>전화번호:</strong> {user.phone || '미입력'}
              </p>
              <p>
                <strong>프로필 사진:</strong> {user.avatar || '없음'}
              </p>
            </div>
          ) : (
            <p className='text-gray-500 text-sm'>사용자 데이터 없음</p>
          )}
        </div>
        {user && (
          <button
            onClick={addOptionalFields}
            className='bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600'
          >
            Optional 필드 추가
          </button>
        )}
        <div className='mt-2 text-xs text-purple-600'>
          <p>💬 실무: phone?, avatar? 같은 Optional 필드 + User | null 처리</p>
        </div>
      </div>

      {/* 🎨 3. UI 설정 */}
      <div className='bg-orange-50 p-4 rounded-md'>
        <h4 className='font-semibold text-orange-800 mb-3'>
          🎨 3. UI 설정 (Union Type)
        </h4>
        <div className='bg-white p-4 rounded border mb-3 space-y-2'>
          <div>
            <span className='text-sm font-medium'>테마: </span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                theme === 'light' ? 'bg-yellow-100' : 'bg-gray-800 text-white'
              }`}
            >
              {theme}
            </span>
          </div>
          <div>
            <span className='text-sm font-medium'>버튼 크기: </span>
            <span
              className={`px-2 py-1 rounded text-xs bg-blue-100 ${
                buttonSize === 'small'
                  ? 'text-xs'
                  : buttonSize === 'medium'
                  ? 'text-sm'
                  : 'text-base'
              }`}
            >
              {buttonSize}
            </span>
          </div>
        </div>
        <div className='space-x-2'>
          <button
            onClick={toggleTheme}
            className='bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600'
          >
            테마 변경
          </button>
          <button
            onClick={changeButtonSize}
            className='bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600'
          >
            크기 변경
          </button>
        </div>
        <div className='mt-2 text-xs text-orange-600'>
          <p>
            💬 실무: 'light' | 'dark', 'small' | 'medium' | 'large' 매일 사용!
          </p>
        </div>
      </div>

      {/* 실무 코드 패턴 */}
      <div className='bg-gray-50 p-4 rounded-md'>
        <h4 className='font-semibold text-gray-800 mb-3'>
          💻 실무에서 매일 보는 코드
        </h4>
        <div className='bg-gray-900 text-green-400 p-3 rounded text-xs font-mono'>
          <pre>{`// 1. API 상태 관리
const [loading, setLoading] = useState<boolean>(false);
const [user, setUser] = useState<User | null>(null);
const [error, setError] = useState<string | null>(null);

// 2. 폼 상태
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// 3. 사용자 권한
type Role = 'admin' | 'user' | 'guest';

// 4. Optional 필드
interface Profile {
  name: string;      // 필수
  email: string;     // 필수  
  bio?: string;      // Optional
  avatar?: string;   // Optional
}`}</pre>
        </div>
      </div>

      {/* 연습 문제 */}
      <div className='bg-yellow-50 p-4 rounded-md'>
        <h4 className='font-semibold text-yellow-800 mb-3'>
          🎯 실무 이해도 체크
        </h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>Q1:</strong> API 호출 시 상태는 보통 몇 가지인가요?
          </p>
          <p className='text-yellow-600'>
            A: 4가지 (idle, loading, success, error)
          </p>

          <p>
            <strong>Q2:</strong> phone?: string과 phone: string의 차이는?
          </p>
          <p className='text-yellow-600'>
            A: ?는 Optional (있어도 되고 없어도 됨)
          </p>

          <p>
            <strong>Q3:</strong> User | null은 언제 사용하나요?
          </p>
          <p className='text-yellow-600'>
            A: 로그인 전이나 데이터 로딩 중일 때
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypeScriptUnion;
