import React, { useState } from 'react';

const ReactPatterns: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎯 React 패턴 예제</h1>

      {/* 예제 1: 조건부 렌더링 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>🔀 예제 1: 조건부 렌더링</h2>
        <ConditionalRendering />
      </section>

      {/* 예제 2: 리스트 렌더링 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>📋 예제 2: 리스트 렌더링</h2>
        <ListRendering />
      </section>

      {/* 예제 3: 컴포넌트 합성 */}
      <section
        style={{
          marginBottom: '40px',
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <h2>🧩 예제 3: 컴포넌트 합성</h2>
        <ComponentComposition />
      </section>
    </div>
  );
};

// 예제 1: 조건부 렌더링 패턴들
const ConditionalRendering: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'guest'>('guest');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setUserRole('user');
      setLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('guest');
  };

  return (
    <div>
      <h4>로그인 상태 관리</h4>

      {/* 패턴 1: && 연산자 */}
      {loading && <p>로그인 중...</p>}

      {/* 패턴 2: 삼항 연산자 */}
      {isLoggedIn ? (
        <div>
          <p>✅ 로그인됨</p>
          <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
            로그아웃
          </button>
        </div>
      ) : (
        <div>
          <p>❌ 로그인 필요</p>
          <button onClick={handleLogin} style={{ padding: '8px 16px' }}>
            로그인
          </button>
        </div>
      )}

      {/* 패턴 3: 다중 조건 */}
      <div
        style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <h5>사용자 권한별 메뉴</h5>
        {userRole === 'admin' && (
          <div>
            <p>🔧 관리자 메뉴</p>
            <button style={{ margin: '5px' }}>사용자 관리</button>
            <button style={{ margin: '5px' }}>시스템 설정</button>
          </div>
        )}

        {userRole === 'user' && (
          <div>
            <p>👤 일반 사용자 메뉴</p>
            <button style={{ margin: '5px' }}>프로필 수정</button>
            <button style={{ margin: '5px' }}>설정</button>
          </div>
        )}

        {userRole === 'guest' && (
          <div>
            <p>👻 게스트 메뉴</p>
            <button style={{ margin: '5px' }}>회원가입</button>
            <button style={{ margin: '5px' }}>로그인</button>
          </div>
        )}

        <div style={{ marginTop: '10px' }}>
          <label>권한 변경: </label>
          <select
            value={userRole}
            onChange={(e) =>
              setUserRole(e.target.value as 'admin' | 'user' | 'guest')
            }
          >
            <option value='guest'>게스트</option>
            <option value='user'>일반 사용자</option>
            <option value='admin'>관리자</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// 예제 2: 리스트 렌더링 패턴들
const ListRendering: React.FC = () => {
  const [todos, setTodos] = useState([
    { id: 1, text: 'React 공부하기', completed: false, priority: 'high' },
    { id: 2, text: '장보기', completed: true, priority: 'low' },
    { id: 3, text: '운동하기', completed: false, priority: 'medium' },
  ]);

  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const addTodo = () => {
    const newId = Math.max(...todos.map((t) => t.id)) + 1;
    const newTodo = {
      id: newId,
      text: `새 할일 ${newId}`,
      completed: false,
      priority: 'medium' as const,
    };
    setTodos((prev) => [...prev, newTodo]);
  };

  // 필터링된 할일 목록
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'completed') return todo.completed;
    if (filter === 'active') return !todo.completed;
    return true;
  });

  return (
    <div>
      <h4>할일 목록 관리</h4>

      {/* 필터 버튼들 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            margin: '5px',
            backgroundColor: filter === 'all' ? '#007bff' : '#f8f9fa',
            color: filter === 'all' ? 'white' : 'black',
            padding: '8px 16px',
          }}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('active')}
          style={{
            margin: '5px',
            backgroundColor: filter === 'active' ? '#007bff' : '#f8f9fa',
            color: filter === 'active' ? 'white' : 'black',
            padding: '8px 16px',
          }}
        >
          미완료
        </button>
        <button
          onClick={() => setFilter('completed')}
          style={{
            margin: '5px',
            backgroundColor: filter === 'completed' ? '#007bff' : '#f8f9fa',
            color: filter === 'completed' ? 'white' : 'black',
            padding: '8px 16px',
          }}
        >
          완료
        </button>
        <button
          onClick={addTodo}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          할일 추가
        </button>
      </div>

      {/* 할일 목록 렌더링 */}
      {filteredTodos.length === 0 ? (
        <p>표시할 할일이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              style={{
                margin: '10px 0',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: todo.completed ? '#f8f9fa' : 'white',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <input
                  type='checkbox'
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span
                  style={{
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    flex: 1,
                  }}
                >
                  {todo.text}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor:
                      todo.priority === 'high'
                        ? '#ff6b6b'
                        : todo.priority === 'medium'
                        ? '#ffd93d'
                        : '#51cf66',
                    color: 'white',
                  }}
                >
                  {todo.priority}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 예제 3: 컴포넌트 합성 패턴들
const ComponentComposition: React.FC = () => {
  return (
    <div>
      <h4>재사용 가능한 컴포넌트들</h4>

      {/* Card 컴포넌트 합성 예제 */}
      <Card>
        <Card.Header>
          <h5>사용자 정보</h5>
        </Card.Header>
        <Card.Body>
          <p>이름: 김개발</p>
          <p>이메일: kim@example.com</p>
        </Card.Body>
        <Card.Footer>
          <button style={{ padding: '8px 16px', marginRight: '10px' }}>
            수정
          </button>
          <button style={{ padding: '8px 16px' }}>삭제</button>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header>
          <h5>알림 설정</h5>
        </Card.Header>
        <Card.Body>
          <label>
            <input type='checkbox' /> 이메일 알림
          </label>
          <br />
          <label>
            <input type='checkbox' /> SMS 알림
          </label>
        </Card.Body>
      </Card>
    </div>
  );
};

// Card 컴포넌트 합성 패턴
const Card: React.FC<{ children: React.ReactNode }> & {
  Header: React.FC<{ children: React.ReactNode }>;
  Body: React.FC<{ children: React.ReactNode }>;
  Footer: React.FC<{ children: React.ReactNode }>;
} = ({ children }) => {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

Card.Header = ({ children }) => (
  <div
    style={{
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd',
    }}
  >
    {children}
  </div>
);

Card.Body = ({ children }) => <div style={{ padding: '15px' }}>{children}</div>;

Card.Footer = ({ children }) => (
  <div
    style={{
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #ddd',
    }}
  >
    {children}
  </div>
);

export default ReactPatterns;
