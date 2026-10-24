'use client';

// 'use client' 이유: 파일 고르기(input type=file)·끌어다 놓기의 선택을 받아 올린다
import { useState, type ReactNode } from 'react';
import { PHOTO_ACCEPT } from '../photoImage';

type PhotoFileButtonProps = {
  // 한 장 (칸 사진). onPickMany가 있으면 그쪽을 부른다
  onPick?: (file: File) => void;
  // 여러 장을 한 번에 (후기 사진 갤러리). 고른 파일을 한꺼번에 넘긴다: 파일마다 따로 부르면
  // 부르는 쪽의 상태가 아직 갱신되지 않아 장수 제한을 셀 수 없다. 몇 장까지 받을지는 부르는 쪽이 정한다
  onPickMany?: (files: File[]) => void;
  disabled?: boolean;
  className: string;
  children: ReactNode;
};

// 사진 고르기 버튼. 아이폰·안드로이드에서는 "사진 찍기 / 사진 보관함" 선택이 뜨고, PC는 파일 창이 열린다.
// PC는 파일을 끌어다 놓아도 된다 (시안 P6a, CLAUDE.md: 불러오기(끌어다 놓기 포함)). 놓을 수 있는 동안 테두리로 알린다.
// 앱 안에서 카메라를 여는 촬영 가이드는 37c2. input을 숨기고 label을 눌러 열어, 버튼 모양·44px 영역을 우리가 정한다
function deliver(
  files: File[],
  onPick: ((file: File) => void) | undefined,
  onPickMany: ((files: File[]) => void) | undefined,
) {
  if (files.length === 0) return;
  if (onPickMany) onPickMany(files);
  else if (files[0]) onPick?.(files[0]);
}

export default function PhotoFileButton({
  onPick,
  onPickMany,
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
        deliver(Array.from(event.dataTransfer.files), onPick, onPickMany);
      }}
    >
      <input
        type='file'
        accept={PHOTO_ACCEPT}
        multiple={onPickMany !== undefined}
        disabled={disabled}
        className='sr-only'
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // 같은 파일을 다시 골라도 change가 오도록 비운다
          event.target.value = '';
          deliver(files, onPick, onPickMany);
        }}
      />
      {children}
    </label>
  );
}
