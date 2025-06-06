// React 기초 학습: Props 사용하기
// Props는 부모에서 자식으로 데이터를 전달하는 방법입니다

// TypeScript에서는 Props의 타입을 정의해야 합니다
interface GreetingProps {
  name: string; // 이름 (필수)
  age?: number; // 나이 (선택사항, ?가 있으면 선택적)
  message?: string; // 메시지 (선택사항)
}

// Props를 매개변수로 받는 컴포넌트
function Greeting(props: GreetingProps) {
  return (
    <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
      <h3 className='text-lg font-semibold text-blue-800'>
        안녕하세요, {props.name}님!
      </h3>

      {/* age가 있을 때만 표시 (조건부 렌더링) */}
      {props.age && <p className='text-blue-600'>나이: {props.age}세</p>}

      {/* message가 있으면 표시, 없으면 기본 메시지 */}
      <p className='text-blue-600'>
        {props.message || 'React Props를 배우고 있습니다!'}
      </p>
    </div>
  );
}

export default Greeting;
