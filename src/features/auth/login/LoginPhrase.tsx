// "나는 나를 키운다" → 나·나·키만 남아 "나나키"가 되는 문구 (design/nanaki-login-handoff spec.md).
// 글자마다 span으로 나눈다: 나·나·키(key)는 색이 바뀌며 뛰고, 나머지(fold, 공백 포함)는 폭이 0으로 접힌다.
// 화면 읽기 프로그램에는 글자 조각이 아니라 문장 하나로 읽히게, 보이는 조각은 숨기고 sr-only 문장을 따로 둔다
// (시안은 <p aria-label>이었는데, p 같은 일반 요소의 aria-label은 읽어 주지 않는 화면 읽기 프로그램이 많다)

type Piece = { text: string; key?: 1 | 2 | 3 };

const PHRASE = '나는 나를 키운다';

const PIECES: readonly Piece[] = [
  { text: '나', key: 1 },
  { text: '는' },
  { text: ' ' },
  { text: '나', key: 2 },
  { text: '를' },
  { text: ' ' },
  { text: '키', key: 3 },
  { text: '운' },
  { text: '다' },
];

export default function LoginPhrase() {
  return (
    <div className='login-phrase-row'>
      <p className='login-phrase'>
        <span className='sr-only'>{PHRASE}</span>
        {PIECES.map((piece, index) => (
          <span
            // 같은 글자(나·공백)가 두 번 나와 글자로는 키를 만들 수 없다. 순서가 바뀌지 않는 고정 목록이라 위치를 키로 쓴다
            key={index}
            aria-hidden='true'
            className={
              piece.key ? `login-key login-key-${piece.key}` : 'login-fold'
            }
          >
            {piece.text}
          </span>
        ))}
      </p>
    </div>
  );
}
