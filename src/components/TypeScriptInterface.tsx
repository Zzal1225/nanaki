import { useState } from 'react';

// ========================================
// TypeScript 심화 1단계: Interface & Type 쉽게 이해하기
// ========================================

// 🏠 1. Interface = 집의 설계도
interface 집 {
  주소: string;
  방개수: number;
  화장실개수: number;
  주차장?: boolean; // ?는 "있어도 되고 없어도 됨"
}

// 📱 2. Interface = 휴대폰 정보
interface 휴대폰 {
  브랜드: string;
  모델명: string;
  색상: string;
  가격: number;
}

// 🎵 3. Type = 음악 장르 (여러 개 중 하나만 선택)
type 음악장르 = '발라드' | '댄스' | '힙합' | '록';
type 크기 = '작음' | '보통' | '큼';

// 🍔 4. Interface 확장 = 기본 음식 → 특별한 음식
interface 음식 {
  이름: string;
  가격: number;
}

interface 햄버거 extends 음식 {
  패티종류: string;
  치즈추가: boolean;
}

const TypeScriptInterface = () => {
  // 🏠 집 만들기
  const [myHouse, setMyHouse] = useState<집>({
    주소: '서울시 강남구 123번지',
    방개수: 3,
    화장실개수: 2,
    // 주차장은 선택사항이라 생략 가능!
  });

  // 📱 휴대폰 만들기
  const [myPhone, setMyPhone] = useState<휴대폰>({
    브랜드: '삼성',
    모델명: '갤럭시 S24',
    색상: '블랙',
    가격: 1200000,
  });

  // 🎵 음악 장르 선택
  const [favoriteGenre, setFavoriteGenre] = useState<음악장르>('발라드');
  const [shirtSize, setShirtSize] = useState<크기>('보통');

  // 🍔 햄버거 만들기 (음식을 확장함)
  const myBurger: 햄버거 = {
    이름: '빅맥',
    가격: 6500,
    패티종류: '소고기',
    치즈추가: true,
  };

  // 함수들
  const addParking = () => {
    setMyHouse((prev) => ({
      ...prev,
      주차장: true,
    }));
  };

  const changePhoneColor = () => {
    const colors = ['블랙', '화이트', '블루', '레드'];
    const currentIndex = colors.indexOf(myPhone.색상);
    const nextIndex = (currentIndex + 1) % colors.length;
    setMyPhone((prev) => ({
      ...prev,
      색상: colors[nextIndex],
    }));
  };

  const changeGenre = () => {
    const genres: 음악장르[] = ['발라드', '댄스', '힙합', '록'];
    const currentIndex = genres.indexOf(favoriteGenre);
    const nextIndex = (currentIndex + 1) % genres.length;
    setFavoriteGenre(genres[nextIndex]);
  };

  return (
    <div className='space-y-6 p-6 bg-white border border-gray-200 rounded-lg'>
      <h3 className='text-xl font-bold text-gray-800 mb-4'>
        TypeScript 심화 1단계: Interface & Type 쉽게 이해하기
      </h3>

      {/* 개념 설명 */}
      <div className='bg-yellow-50 p-4 rounded-lg border border-yellow-200'>
        <h4 className='font-bold text-yellow-800 mb-3'>💡 쉽게 이해하기</h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>🏗️ Interface:</strong> 건물의 설계도처럼 "이런 모양이어야
            해!"라고 정해주는 것
          </p>
          <p>
            <strong>🎯 Type:</strong> 메뉴판처럼 "이것들 중에서 하나만
            골라!"라고 선택지를 주는 것
          </p>
          <p>
            <strong>❓ ? (Optional):</strong> "있어도 되고 없어도 돼"라는 뜻
          </p>
        </div>
      </div>

      {/* 🏠 1. 집 예시 */}
      <div className='bg-blue-50 p-4 rounded-md'>
        <h4 className='font-semibold text-blue-800 mb-3'>
          🏠 1. Interface = 집의 설계도
        </h4>
        <div className='bg-white p-4 rounded border space-y-1'>
          <p>
            <strong>우리 집 정보:</strong>
          </p>
          <p>📍 주소: {myHouse.주소}</p>
          <p>🏠 방 개수: {myHouse.방개수}개</p>
          <p>🚽 화장실: {myHouse.화장실개수}개</p>
          <p>🚗 주차장: {myHouse.주차장 ? '있음' : '없음'}</p>
        </div>
        <button
          onClick={addParking}
          className='mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600'
        >
          주차장 추가하기
        </button>
        <div className='mt-2 text-xs text-blue-600'>
          <p>💬 주차장은 Optional(선택사항)이라서 나중에 추가할 수 있어요!</p>
        </div>
      </div>

      {/* 📱 2. 휴대폰 예시 */}
      <div className='bg-green-50 p-4 rounded-md'>
        <h4 className='font-semibold text-green-800 mb-3'>
          📱 2. Interface = 휴대폰 정보 양식
        </h4>
        <div className='bg-white p-4 rounded border space-y-1'>
          <p>
            <strong>내 휴대폰:</strong>
          </p>
          <p>📱 브랜드: {myPhone.브랜드}</p>
          <p>📲 모델: {myPhone.모델명}</p>
          <p>🎨 색상: {myPhone.색상}</p>
          <p>💰 가격: {myPhone.가격.toLocaleString()}원</p>
        </div>
        <button
          onClick={changePhoneColor}
          className='mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600'
        >
          색상 바꾸기
        </button>
        <div className='mt-2 text-xs text-green-600'>
          <p>💬 Interface로 정해진 형태대로만 데이터를 넣을 수 있어요!</p>
        </div>
      </div>

      {/* 🎵 3. Type 예시 */}
      <div className='bg-purple-50 p-4 rounded-md'>
        <h4 className='font-semibold text-purple-800 mb-3'>
          🎵 3. Type = 선택 메뉴
        </h4>
        <div className='bg-white p-4 rounded border space-y-2'>
          <p>
            <strong>좋아하는 음악:</strong>
            <span className='ml-2 px-2 py-1 bg-purple-100 rounded text-sm'>
              {favoriteGenre}
            </span>
          </p>
          <p>
            <strong>옷 사이즈:</strong>
            <span className='ml-2 px-2 py-1 bg-purple-100 rounded text-sm'>
              {shirtSize}
            </span>
          </p>
        </div>
        <button
          onClick={changeGenre}
          className='mt-2 bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600'
        >
          음악 장르 바꾸기
        </button>
        <div className='mt-2 text-xs text-purple-600'>
          <p>
            💬 Type은 정해진 선택지에서만 고를 수 있어요! (발라드, 댄스, 힙합,
            록)
          </p>
        </div>
      </div>

      {/* 🍔 4. Interface 확장 예시 */}
      <div className='bg-orange-50 p-4 rounded-md'>
        <h4 className='font-semibold text-orange-800 mb-3'>
          🍔 4. Interface 확장 = 기본 → 업그레이드
        </h4>
        <div className='bg-white p-4 rounded border space-y-1'>
          <p>
            <strong>내가 주문한 햄버거:</strong>
          </p>
          <p>🍔 이름: {myBurger.이름}</p>
          <p>💰 가격: {myBurger.가격}원</p>
          <p>🥩 패티: {myBurger.패티종류}</p>
          <p>🧀 치즈: {myBurger.치즈추가 ? '추가함' : '안함'}</p>
        </div>
        <div className='mt-2 text-xs text-orange-600'>
          <p>
            💬 음식 Interface를 확장해서 햄버거만의 특별한 정보를 추가했어요!
          </p>
        </div>
      </div>

      {/* 코드 예시 */}
      <div className='bg-gray-50 p-4 rounded-md'>
        <h4 className='font-semibold text-gray-800 mb-3'>
          💻 실제 코드로 보기
        </h4>
        <div className='bg-gray-900 text-green-400 p-3 rounded text-xs font-mono'>
          <pre>{`// Interface = 설계도
interface 집 {
  주소: string;        // 반드시 있어야 함
  방개수: number;      // 반드시 있어야 함
  주차장?: boolean;    // ? = 있어도 되고 없어도 됨
}

// Type = 선택 메뉴
type 음악장르 = '발라드' | '댄스' | '힙합' | '록';

// 사용하기
const 우리집: 집 = {
  주소: "서울시 강남구",
  방개수: 3  // 주차장은 생략 가능!
};`}</pre>
        </div>
      </div>

      {/* 연습 문제 */}
      <div className='bg-pink-50 p-4 rounded-md'>
        <h4 className='font-semibold text-pink-800 mb-3'>
          🎯 이해했는지 확인해보기
        </h4>
        <div className='space-y-2 text-sm'>
          <p>
            <strong>Q1:</strong> Interface는 무엇과 비슷한가요?
          </p>
          <p className='text-pink-600'>
            A: 건물의 설계도 (어떤 모양이어야 하는지 정해줌)
          </p>

          <p>
            <strong>Q2:</strong> Type은 언제 사용하나요?
          </p>
          <p className='text-pink-600'>
            A: 여러 선택지 중 하나만 고를 때 (메뉴판처럼)
          </p>

          <p>
            <strong>Q3:</strong> ?의 의미는?
          </p>
          <p className='text-pink-600'>A: 있어도 되고 없어도 되는 선택사항</p>
        </div>
      </div>
    </div>
  );
};

export default TypeScriptInterface;
