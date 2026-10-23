import Image from 'next/image';

type NakiAvatarProps = {
  // 보이는 크기(px). 나키 대화 줄 32, 나키 빈 화면 56, 사이드바 로고 32, 로그인 로고 112
  size: number;
  // 첫 화면 위쪽의 큰 그림일 때(로그인 로고): 기본값(lazy)으로 두면 늦게 받아 첫 화면 그리기(LCP)가 늦어진다.
  // priority는 Next 16에서 없어질 예정이고, 문서는 대부분 preload보다 loading="eager" + fetchPriority="high"를 권한다
  isAboveFold?: boolean;
};

// 나키 아바타 (새싹 얼굴, 2026-10-23 사용자 시안). 처음엔 나키 탭에서만 썼고, 같은 날 앱 아이콘·로고도 모두 이것으로 바꿔
// (사용자 결정) features/naki에서 shared/ui로 옮겼다: 공통 레이아웃(사이드바)이 기능 폴더를 import하지 않게.
// 원본은 512px PNG라 next/image로 보이는 크기에 맞는 작은 파일을 받게 한다 (32px 자리에 512px을 받지 않게).
// 장식이라 alt를 비운다: 나키 줄은 바로 옆 글이 답이고, 로고는 바로 옆에 "nanaki" 글자가 있다
export default function NakiAvatar({
  size,
  isAboveFold = false,
}: NakiAvatarProps) {
  return (
    <Image
      src='/icons/naki-avatar-512.png'
      alt=''
      width={size}
      height={size}
      loading={isAboveFold ? 'eager' : 'lazy'}
      fetchPriority={isAboveFold ? 'high' : 'auto'}
      className='shrink-0 rounded-full'
    />
  );
}
