import React from 'react';
import HelloWorld from './HelloWorld';
import Greeting from './Greeting';
import Counter from './Counter';
import TypeScriptBasics from './TypeScriptBasics';
import TypeScriptInterface from './TypeScriptInterface';
import TypeScriptGeneric from './TypeScriptGeneric';
import TypeScriptUnion from './TypeScriptUnion';
import ReactUseEffect from './ReactUseEffect';
import ReactCustomHook from './ReactCustomHook';
import ReactPatterns from './ReactPatterns';

interface LearningPageProps {
  onBackToProject?: () => void;
}

const LearningPage: React.FC<LearningPageProps> = ({ onBackToProject }) => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-8'>
        <header className='text-center mb-12'>
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4'>
            📚 React + TypeScript 학습 페이지
          </h1>
          <p className='text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8'>
            언제든 돌아와서 학습 내용을 복습할 수 있는 페이지
          </p>

          {/* nanaki 프로젝트로 돌아가기 버튼 */}
          <button
            onClick={onBackToProject}
            className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm'
          >
            ← nanaki 프로젝트로 돌아가기
          </button>
        </header>

        {/* React 기초 학습 (완료) */}
        <div className='mb-12 p-6 bg-green-50 border-2 border-green-200 rounded-lg'>
          <h2 className='text-xl font-bold text-green-800 mb-4'>
            ✅ React 기초 학습 (완료)
          </h2>

          {/* 1단계: 기본 컴포넌트 */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 기초 1단계: 컴포넌트 (Component)
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              React에서 가장 중요한 개념은 컴포넌트입니다. 컴포넌트는 "재사용
              가능한 UI 조각"이라고 생각하시면 됩니다.
            </p>
            <HelloWorld />
          </div>

          {/* 2단계: Props 사용 */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 기초 2단계: Props
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              Props는 "부모 컴포넌트에서 자식 컴포넌트로 데이터를 전달하는
              방법"입니다.
            </p>
            <div className='space-y-3'>
              <Greeting name='김개발' />
              <Greeting
                name='이프론트'
                age={25}
                message='TypeScript와 React를 배우는 중입니다!'
              />
              <Greeting name='박리액트' age={30} />
            </div>
          </div>

          {/* 3단계: State 관리 */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 기초 3단계: State (useState Hook)
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              State는 "컴포넌트 안에서 변경되는 데이터"를 관리하는 방법입니다.
            </p>
            <Counter />
          </div>

          {/* 4단계: TypeScript 기본 타입 */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 기초 4단계: TypeScript 기본 타입
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              TypeScript의 기본 타입들(string, number, boolean, array)을
              배워봅니다.
            </p>
            <TypeScriptBasics />
          </div>
        </div>

        {/* TypeScript 심화 학습 (완료) */}
        <div className='mb-12 p-6 bg-green-50 border-2 border-green-200 rounded-lg'>
          <h2 className='text-xl font-bold text-green-800 mb-4'>
            ✅ TypeScript 심화 학습 (완료)
          </h2>

          {/* TypeScript 심화 1단계: Interface & Type */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              TypeScript 심화 1단계: Interface & Type
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              TypeScript에서 가장 강력한 기능 중 하나는{' '}
              <strong>Interface</strong>와 <strong>Type</strong>입니다. 이들은
              "객체나 함수의 구조를 미리 정의해주는 설계도"라고 생각하시면
              됩니다.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>Interface:</strong> 객체의 모양을 정의, 확장 가능
                (extends 사용)
              </p>
              <p>
                <strong>Type:</strong> 더 유연한 타입 정의, Union, Intersection
                등에 강력
              </p>
            </div>
            <TypeScriptInterface />
          </div>

          {/* TypeScript 심화 2단계: Generic */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              TypeScript 심화 2단계: Generic
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              Generic은 "재사용 가능한 타입"을 만드는 방법입니다. 마치 "빈 칸이
              있는 템플릿"처럼, 나중에 원하는 타입을 넣어서 사용할 수 있어요.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>📦 택배 상자 비유:</strong> 상자는 똑같지만, 안에 들어갈
                물건은 다를 수 있음
              </p>
              <p>
                <strong>♻️ 재사용성:</strong> 한 번 만들어두면 여러 타입에서
                사용 가능
              </p>
            </div>
            <TypeScriptGeneric />
          </div>

          {/* TypeScript 심화 3단계: Union Type & Optional */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              TypeScript 심화 3단계: Union Type & Optional
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              실무에서 **매일 10번 이상** 사용하는 필수 문법입니다. API 상태
              관리, 사용자 권한, 선택적 필드 등에 사용해요.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>Union Type (|):</strong> "이것 중 하나만" - 'loading' |
                'success' | 'error'
              </p>
              <p>
                <strong>Optional (?):</strong> "있어도 되고 없어도 됨" - phone?:
                string
              </p>
            </div>
            <TypeScriptUnion />
          </div>
        </div>

        {/* React 심화 학습 (완료) */}
        <div className='mb-12 p-6 bg-green-50 border-2 border-green-200 rounded-lg'>
          <h2 className='text-xl font-bold text-green-800 mb-4'>
            ✅ React 심화 학습 (완료)
          </h2>

          {/* React 심화 1단계: useEffect Hook */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 심화 1단계: useEffect Hook
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              useEffect는 "컴포넌트가 렌더링될 때 특정 작업을 수행하도록
              설정"하는 Hook입니다. 실무에서는 API 호출, 타이머 설정, 이벤트
              리스너 등록 등에 사용합니다.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>📋 페이지 로딩:</strong> 페이지가 열릴 때 데이터
                가져오기
              </p>
              <p>
                <strong>🔍 실시간 검색:</strong> 입력값이 바뀔 때마다 검색하기
              </p>
              <p>
                <strong>⏰ 메모리 정리:</strong> 타이머나 구독을 안전하게
                정리하기
              </p>
            </div>
            <ReactUseEffect />
          </div>

          {/* React 심화 2단계: Custom Hook */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 심화 2단계: Custom Hook
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              Custom Hook은 "반복되는 로직을 재사용 가능한 Hook으로 만드는
              것"입니다. 실무에서는 API 호출, 로컬 스토리지, 폼 관리 등에
              사용합니다.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>🔄 API 재사용:</strong> 여러 컴포넌트에서 같은 API 호출
                패턴 사용
              </p>
              <p>
                <strong>💾 상태 관리:</strong> 로컬 스토리지, 세션 스토리지 관리
              </p>
              <p>
                <strong>📝 폼 관리:</strong> 입력값 상태와 검증 로직 재사용
              </p>
            </div>
            <ReactCustomHook />
          </div>

          {/* React 심화 3단계: React 패턴들 */}
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-green-700 mb-2'>
              React 심화 3단계: React 패턴들
            </h3>
            <p className='text-sm text-green-600 mb-2'>
              React 패턴들은 "실무에서 자주 사용하는 UI 렌더링 기법"입니다.
              조건부 렌더링, 리스트 렌더링, 컴포넌트 합성 등을 다룹니다.
            </p>
            <div className='text-xs text-green-500 mb-4 space-y-1'>
              <p>
                <strong>🔀 조건부 렌더링:</strong> 상황에 따라 다른 UI 보여주기
              </p>
              <p>
                <strong>📋 리스트 렌더링:</strong> 배열 데이터를 목록으로
                표시하기
              </p>
              <p>
                <strong>🧩 컴포넌트 합성:</strong> 재사용 가능한 컴포넌트
                설계하기
              </p>
            </div>
            <ReactPatterns />
          </div>
        </div>

        {/* 학습 완료 메시지 */}
        <div className='text-center p-8 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg'>
          <h2 className='text-2xl font-bold text-gray-800 mb-4'>
            🎉 축하합니다! 모든 학습이 완료되었습니다!
          </h2>
          <p className='text-gray-600 mb-6'>
            이제 nanaki 프로젝트에서 React + TypeScript를 자유자재로 사용할
            준비가 되었습니다.
          </p>
          <button
            onClick={onBackToProject}
            className='bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm'
          >
            nanaki 프로젝트 시작하기 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;
