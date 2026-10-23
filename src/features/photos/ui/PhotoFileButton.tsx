'use client';

// 'use client' 이유: 파일 고르기(input type=file)·끌어다 놓기의 선택을 받아 올린다
import { useState, type ReactNode } from 'react';
import { PHOTO_ACCEPT } from '../photoImage';

type PhotoFileButtonProps = {
  onPick: (file: File) => void;
  disabled?: boolean;
  className: string;
  children: ReactNode;
};

// 사진 고르기 버튼. 아이폰·안드로이드에서는 "사진 찍기 / 사진 보관함" 선택이 뜨고, PC는 파일 창이 열린다.
// PC는 파일을 끌어다 놓아도 된다 (시안 P6a, CLAUDE.md: 불러오기(끌어다 놓기 포함)). 놓을 수 있는 동안 테두리로 알린다.
// 앱 안에서 카메라를 여는 촬영 가이드는 37c2. input을 숨기고 label을 눌러 열어, 버튼 모양·44px 영역을 우리가 정한다
export default function PhotoFileButton({
  onPick,
  disabled = false,
  className,
  children,
}: PhotoFileButtonProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <label
      className={`${className} ${disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'} ${isDragOver ? 'ring-2 ring-accent' : ''}`}
      aria-disabled={disabled}
      onDragOver={(event) => {
        if (disabled) return;
        // 기본 동작(브라우저가 파일을 새 탭으로 열기)을 막아야 drop이 온다
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onPick(file);
      }}
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
