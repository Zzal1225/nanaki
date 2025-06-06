import React, { useState, useEffect } from 'react';

const ReactUseEffect: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎯 React useEffect 예제</h1>

      {/* 예제 1: 컴포넌트 마운트 시 데이터 로딩 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>📋 예제 1: 페이지 로딩 시 데이터 가져오기</h2>
        <UserList />
      </section>

      {/* 예제 2: 상태 변화에 따른 side effect */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>🔍 예제 2: 검색어 변화 시 검색 실행</h2>
        <ProductSearch />
      </section>

      {/* 예제 3: cleanup function */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>⏰ 예제 3: 타이머와 정리 함수</h2>
        <Timer />
      </section>
    </div>
  );
};

// 예제 1: 컴포넌트 마운트 시 API 호출
const UserList: React.FC = () => {
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // API 호출 시뮬레이션
    setTimeout(() => {
      setUsers(['김철수', '이영희', '박민수']);
      setLoading(false);
    }, 1000);
  }, []); // 빈 dependency array = 마운트 시에만 실행

  return (
    <div>
      <h3>사용자 목록</h3>
      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 예제 2: dependency array 사용
const ProductSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      // 검색 API 호출 시뮬레이션
      const mockResults = ['아이폰', '아이패드', '애플워치'].filter((product) =>
        product.includes(searchTerm)
      );
      setResults(mockResults);
    } else {
      setResults([]);
    }
  }, [searchTerm]); // searchTerm이 변경될 때마다 실행

  return (
    <div>
      <h3>상품 검색</h3>
      <input
        type='text'
        placeholder='검색어를 입력하세요'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ padding: '8px', width: '200px', marginRight: '10px' }}
      />
      <div>
        <h4>검색 결과:</h4>
        {results.length > 0 ? (
          <ul>
            {results.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ul>
        ) : (
          searchTerm && <p>검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

// 예제 3: cleanup function 사용
const Timer: React.FC = () => {
  const [time, setTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    let intervalId: number | undefined;

    if (isRunning) {
      intervalId = window.setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }

    // cleanup function - 컴포넌트 언마운트나 의존성 변경 시 실행
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning]); // isRunning 변경 시마다 실행

  return (
    <div>
      <h3>실시간 타이머</h3>
      <p>경과 시간: {time}초</p>
      <button
        onClick={() => setIsRunning(!isRunning)}
        style={{ padding: '8px 16px', marginRight: '10px' }}
      >
        {isRunning ? '정지' : '시작'}
      </button>
      <button
        onClick={() => {
          setTime(0);
          setIsRunning(false);
        }}
        style={{ padding: '8px 16px' }}
      >
        리셋
      </button>
    </div>
  );
};

export default ReactUseEffect;
