'use client';

// 'use client' 이유: 열림 상태, 포커스 가두기, Esc·바깥 누르기 닫기가 브라우저에서 일어난다
import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // 제목 옆 꾸밈 (필터 시트의 타입 뱃지)
  titleAddon?: ReactNode;
  children: ReactNode;
};

// 시트 하나에 두 모양 (CLAUDE.md: 모바일 바텀시트 / PC 오른쪽 패널). 크기에 따른 차이는 CSS로만 나눈다:
// 화면 폭으로 다른 컴포넌트를 그리면 서버와 브라우저의 첫 화면이 달라진다(하이드레이션 불일치).
// Radix Dialog: 열리면 포커스를 안에 가두고, 닫히면 연 버튼으로 포커스를 돌려준다. role="dialog"와 제목 연결도 맡는다
export default function Sheet({
  open,
  onOpenChange,
  title,
  titleAddon,
  children,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-overlay' />
        <Dialog.Content
          // 설명 문구가 없는 시트라 aria-describedby를 비운다 (Radix가 Description을 찾으며 경고하지 않게)
          aria-describedby={undefined}
          className='fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-lg bg-surface-raised shadow-float lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[400px] lg:rounded-none'
        >
          {/* 손잡이: 바텀시트임을 보여 주는 표시일 뿐 끌어서 닫는 기능은 없다 (닫기는 × 버튼·바깥·Esc) */}
          <span
            aria-hidden='true'
            className='mx-auto mt-2 mb-1 h-1 w-9 rounded-full bg-border lg:hidden'
          />
          <div className='flex h-13 shrink-0 items-center gap-2 pr-1 pl-4 lg:mt-2'>
            <Dialog.Title className='text-title text-fg-primary'>
              {title}
            </Dialog.Title>
            {titleAddon}
            <span className='flex-1' />
            <Dialog.Close
              aria-label='닫기'
              className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover'
            >
              <X
                aria-hidden='true'
                size={ICON_SIZE.lg}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </Dialog.Close>
          </div>
          {/* 모바일 바텀시트는 화면 맨 아래에 붙어 아이폰 홈 막대와 겹친다 → 아래 여백에 그만큼 더한다 (2026-10-24 사용자: 바꾸기·지우기 아래가 빠듯함).
              PC 오른쪽 패널은 홈 막대가 없어 16px 그대로 */}
          <div className='min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(16px+env(safe-area-inset-bottom))] lg:pb-4'>
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
