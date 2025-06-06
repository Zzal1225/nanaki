import React, { useState, useEffect } from 'react';

const ReactCustomHook: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎯 React Custom Hook 예제</h1>

      {/* 예제 1: API 호출 로직 재사용 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>🔄 예제 1: API 호출 로직 재사용 (useFetch)</h2>
        <UserProfile />
        <ProductList />
      </section>

      {/* 예제 2: 로컬 스토리지 관리 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>💾 예제 2: 로컬 스토리지 관리 (useLocalStorage)</h2>
        <Settings />
      </section>

      {/* 예제 3: 폼 상태 관리 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>📝 예제 3: 폼 상태 관리 (useForm)</h2>
        <ContactForm />
      </section>
    </div>
  );
};

// Custom Hook 1: API 호출 로직 재사용
const useFetch = <T,>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 실제 API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (url === '/api/user') {
          setData({ name: '김개발', email: 'kim@example.com' } as T);
        } else if (url === '/api/products') {
          setData(['노트북', '마우스', '키보드'] as T);
        }
      } catch (err) {
        setError('데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};

// Custom Hook 2: 로컬 스토리지 관리
const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('로컬 스토리지 저장 실패:', error);
    }
  };

  return [storedValue, setValue] as const;
};

// Custom Hook 3: 폼 상태 관리
const useForm = <T extends Record<string, any>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange =
    (name: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({
        ...prev,
        [name]: event.target.value,
      }));
    };

  const reset = () => {
    setValues(initialValues);
  };

  return { values, handleChange, reset };
};

// useFetch 사용 예제 1
const UserProfile: React.FC = () => {
  const {
    data: user,
    loading,
    error,
  } = useFetch<{ name: string; email: string }>('/api/user');

  if (loading) return <p>사용자 정보 로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <div>
      <h4>사용자 프로필</h4>
      <p>이름: {user?.name}</p>
      <p>이메일: {user?.email}</p>
    </div>
  );
};

// useFetch 사용 예제 2
const ProductList: React.FC = () => {
  const {
    data: products,
    loading,
    error,
  } = useFetch<string[]>('/api/products');

  if (loading) return <p>상품 목록 로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <div>
      <h4>상품 목록</h4>
      <ul>
        {products?.map((product, index) => (
          <li key={index}>{product}</li>
        ))}
      </ul>
    </div>
  );
};

// useLocalStorage 사용 예제
const Settings: React.FC = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [fontSize, setFontSize] = useLocalStorage<number>('fontSize', 16);

  return (
    <div>
      <h4>설정</h4>
      <div style={{ marginBottom: '10px' }}>
        <label>테마: </label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
        >
          <option value='light'>라이트</option>
          <option value='dark'>다크</option>
        </select>
        <span style={{ marginLeft: '10px' }}>현재: {theme}</span>
      </div>
      <div>
        <label>글자 크기: </label>
        <input
          type='range'
          min='12'
          max='24'
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
        <span style={{ marginLeft: '10px' }}>{fontSize}px</span>
      </div>
    </div>
  );
};

// useForm 사용 예제
const ContactForm: React.FC = () => {
  const { values, handleChange, reset } = useForm({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('폼 데이터:', values);
    alert(
      `이름: ${values.name}\n이메일: ${values.email}\n메시지: ${values.message}`
    );
    reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '10px' }}>
        <input
          type='text'
          placeholder='이름'
          value={values.name}
          onChange={handleChange('name')}
          style={{ padding: '8px', width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <input
          type='email'
          placeholder='이메일'
          value={values.email}
          onChange={handleChange('email')}
          style={{ padding: '8px', width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <input
          type='text'
          placeholder='메시지'
          value={values.message}
          onChange={handleChange('message')}
          style={{ padding: '8px', width: '200px' }}
        />
      </div>
      <button
        type='submit'
        style={{ padding: '8px 16px', marginRight: '10px' }}
      >
        전송
      </button>
      <button type='button' onClick={reset} style={{ padding: '8px 16px' }}>
        초기화
      </button>
    </form>
  );
};

export default ReactCustomHook;
