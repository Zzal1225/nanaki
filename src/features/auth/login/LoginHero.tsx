import LoginAvatar from './LoginAvatar';
import LoginPhrase from './LoginPhrase';

// 로그인 화면과 앱을 열 때의 로딩 화면(AppSplash)이 같이 쓰는 윗부분: nanaki · 아바타 · 나는 나를 키운다 · 슬로건.
// 둘이 같은 부품·같은 자리여야 로그인 버튼을 누른 뒤 로딩 화면으로 넘어갈 때 아무것도 움직이지 않는다.
// 로딩 화면에서는 각 화면에 제목(h1)이 따로 있어서 nanaki를 제목으로 두지 않는다
export default function LoginHero({ wordmarkAs }: { wordmarkAs: 'h1' | 'p' }) {
  const Wordmark = wordmarkAs;
  return (
    <>
      <Wordmark className='login-wordmark'>nanaki</Wordmark>
      <LoginAvatar />
      <LoginPhrase />
      <p className='login-slogan'>오늘의 나를 돌보는 가장 작은 습관</p>
    </>
  );
}
