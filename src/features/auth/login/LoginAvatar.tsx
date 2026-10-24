// 로그인 화면의 나키 아바타 (반전 색: 흰 원 · 초록 얼굴, design/nanaki-login-handoff).
// 다른 화면의 아바타(NakiAvatar)는 PNG지만 여기는 조각마다(원·잎·얼굴·눈·반짝이) 따로 움직여야 해서 SVG를 그대로 둔다.
// 모양(path)은 시안 naki-avatar.svg와 같고, 색만 반전했다. 움직임은 loginScreen.css의 login-av-* 클래스.
// 장식이라 화면 읽기 프로그램에서 숨긴다: 바로 위에 "nanaki" 제목이 있다
export default function LoginAvatar() {
  return (
    <div className='login-avatar' aria-hidden='true'>
      <span className='login-ring login-ring-1' />
      <span className='login-ring login-ring-2' />
      <svg viewBox='0 0 48 48'>
        <circle
          className='login-av-circle'
          cx='24'
          cy='24'
          r='24'
          fill='var(--login-fg)'
        />
        <path
          d='M24 20v-5'
          stroke='var(--login-bg)'
          strokeWidth='2.2'
          strokeLinecap='round'
        />
        <path
          className='login-av-leaf-left'
          d='M24 15.5c-1.2-4.2-4.6-6.2-9.2-5.6.4 4.4 4 6.8 9.2 5.6z'
          fill='var(--login-leaf)'
        />
        <path
          className='login-av-leaf-right'
          d='M24 14.5c1.2-3.6 4.4-5.4 8.4-4.8-.6 3.8-3.8 5.8-8.4 4.8z'
          fill='var(--login-leaf)'
        />
        <g className='login-av-face'>
          <circle cx='24' cy='29' r='10' fill='var(--login-bg)' />
          <g className='login-av-eyes'>
            <ellipse
              cx='20.6'
              cy='28.6'
              rx='1.5'
              ry='1.9'
              fill='var(--login-fg)'
            />
            <ellipse
              cx='27.4'
              cy='28.6'
              rx='1.5'
              ry='1.9'
              fill='var(--login-fg)'
            />
          </g>
          <path
            d='M21.8 32.2q2.2 2 4.4 0'
            stroke='var(--login-fg)'
            strokeWidth='1.6'
            fill='none'
            strokeLinecap='round'
          />
        </g>
        <path
          className='login-av-spark'
          d='M37.5 11.6l.952 2.448 2.448.952-2.448.952-.952 2.448-.952-2.448-2.448-.952 2.448-.952z'
          fill='var(--login-bg)'
        />
      </svg>
    </div>
  );
}
