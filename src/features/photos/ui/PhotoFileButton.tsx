'use client';

// 'use client' 이유: 파일 고르기(input type=file)의 선택을 받아 올린다
import type { ReactNode } from 'react';
import { PHOTO_ACCEPT } from '../photoImage';

type PhotoFileButtonProps = {
  onPick: (file: File) => void;
  disabled?: boolean;
  className: string;
  children: ReactNode;
};

// 사진 고르기 버튼. 아이폰·안드로이드에서는 "사진 찍기 / 사진 보관함" 선택이 뜨고, PC는 파일 창이 열린다.
// 앱 안에서 카메라를 여는 촬영 가이드는 37c. input을 숨기고 label을 눌러 열어, 버튼 모양·44px 영역을 우리가 정한다
export default function PhotoFileButton({
  onPick,
  disabled = false,
  className,
  children,
}: PhotoFileButtonProps) {
  return (
    <label
      className={`${className} ${disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
      aria-disabled={disabled}
    >
      <input
        type='file'
        accept={PHOTO_ACCEPT}
        disabled={disabled}
        className='sr-only'
        onChange={(event) => {
          const file = event.target.files?.[0];
          // 같은 파일을 다시 골라도 change가 오도록 비운다
          event.target.value = '';
          if (file) onPick(file);
        }}
      />
      {children}
    </label>
  );
}
