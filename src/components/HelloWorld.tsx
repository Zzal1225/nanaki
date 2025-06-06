// React 기초 학습: 첫 번째 컴포넌트
// 컴포넌트는 함수로 만들 수 있습니다
function HelloWorld() {
  // JSX를 반환합니다 (HTML과 비슷한 문법)
  return (
    <div>
      <h1>안녕하세요! 첫 번째 React 컴포넌트입니다.</h1>
      <p>이것은 HelloWorld 컴포넌트입니다.</p>
    </div>
  );
}

// 다른 파일에서 사용할 수 있도록 내보냅니다
export default HelloWorld;
