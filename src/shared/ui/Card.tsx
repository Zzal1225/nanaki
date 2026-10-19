import type { ComponentProps } from 'react';

// 카드 틀만 담당한다. 안에 무엇을 넣을지(기록 카드, 타입 요약 카드)는 쓰는 쪽에서 정한다
export default function Card({
  className = '',
  children,
  ...rest
}: ComponentProps<'div'>) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-surface shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
