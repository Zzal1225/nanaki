import Image from 'next/image';

type NakiAvatarProps = {
  // 보이는 크기(px). 대화 줄은 32, 빈 화면 가운데는 56 (시안)
  size: number;
};

// 나키 아바타 (새싹 얼굴, 2026-10-23 사용자 시안): AI가 말하는 줄 앞에 붙여 "누가 말하는지"를 글자 없이 알린다.
// 원본은 512px PNG라 next/image로 보이는 크기에 맞는 작은 파일을 받게 한다 (32px 자리에 512px을 받지 않게).
// 장식이라 alt를 비운다: 바로 옆 글이 답이고, 화면 읽기 프로그램이 매 줄 "나키"를 반복해 읽지 않게
export default function NakiAvatar({ size }: NakiAvatarProps) {
  return (
    <Image
      src='/icons/naki-avatar-512.png'
      alt=''
      width={size}
      height={size}
      className='shrink-0 rounded-full'
    />
  );
}
