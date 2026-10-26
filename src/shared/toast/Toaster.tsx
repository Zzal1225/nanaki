'use client';

// 'use client' 이유: 토스트 상태(Zustand)를 구독하고 5초 타이머가 브라우저에서 돈다
import { Toast } from 'radix-ui';
import { CircleAlert, RotateCw, Undo2 } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useToastStore } from './toastStore';

// 시안: 되돌릴 수 있는 시간 5초
export const TOAST_DURATION_MS = 5000;
// 길게 보여 줄 안내 (보고서 PDF 위치처럼 읽고 따라 할 글)
export const LONG_TOAST_DURATION_MS = 10_000;

// 앱 전체에 하나. Radix Toast가 맡는 것: 정한 시간 뒤 닫기, 마우스를 올리거나 포커스가 있으면 타이머 멈춤,
// 스크린 리더에 알림(aria-live), F8로 토스트로 이동, 스와이프로 닫기
export default function Toaster() {
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <Toast.Provider duration={TOAST_DURATION_MS} label='알림'>
      {toast && (
        <Toast.Root
          // id가 바뀌면 새 토스트로 그려 타이머가 처음부터 다시 돈다
          key={toast.id}
          open
          // 없으면 Provider의 기본 시간(5초)
          duration={toast.durationMs}
          onOpenChange={(open) => {
            if (!open) dismissToast();
          }}
          className='flex min-h-12 w-full max-w-md items-center gap-2 rounded-md bg-fg-primary py-1 pr-1 pl-4 text-body-sm text-surface shadow-float'
        >
          {toast.tone === 'error' && (
            <CircleAlert
              aria-hidden='true'
              size={ICON_SIZE.md}
              strokeWidth={ICON_STROKE_WIDTH}
              className='shrink-0'
            />
          )}
          <Toast.Description className='flex-1'>
            {toast.message}
          </Toast.Description>
          {toast.action && (
            // altText: 스크린 리더는 버튼에 바로 가지 못할 수 있어서 "어떻게 하면 되는지"를 따로 읽어 준다
            <Toast.Action
              altText={`${toast.action.label}하려면 이 알림의 버튼을 누르세요`}
              onClick={toast.action.onAction}
              className='inline-flex min-h-11 items-center gap-1 px-3 font-semibold underline underline-offset-3'
            >
              {toast.action.icon === 'retry' ? (
                <RotateCw
                  aria-hidden='true'
                  size={ICON_SIZE.sm}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              ) : (
                <Undo2
                  aria-hidden='true'
                  size={ICON_SIZE.sm}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              )}
              {toast.action.label}
            </Toast.Action>
          )}
        </Toast.Root>
      )}
      {/* 모바일: 하단 탭 위. 태블릿·PC: 사이드바를 뺀 콘텐츠 영역 아래 가운데 (시안) */}
      <Toast.Viewport className='fixed inset-x-4 bottom-[calc(var(--tab-bar-height)+16px)] z-50 flex justify-center outline-none md:right-4 md:bottom-6 md:left-[calc(var(--sidebar-collapsed)+16px)] lg:left-[calc(var(--sidebar-expanded)+16px)]' />
    </Toast.Provider>
  );
}
