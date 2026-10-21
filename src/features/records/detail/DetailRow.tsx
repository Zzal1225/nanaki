import type { ReactNode } from 'react';

type DetailRowProps = {
  label: string;
  children: ReactNode;
};

// 상세 표의 한 줄 (시안: 왼쪽 64px 이름, 오른쪽 값). dt/dd라서 스크린 리더가 "이름: 값" 짝으로 읽는다
export default function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className='flex min-h-12 gap-3 border-t border-border px-4 py-3 text-body text-fg-primary first:border-t-0'>
      <dt className='w-16 shrink-0 text-body-sm leading-6 text-fg-secondary'>
        {label}
      </dt>
      <dd className='min-w-0 flex-1'>{children}</dd>
    </div>
  );
}
