import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  children: ReactNode;
};

export default function Section({ title, children }: SectionProps) {
  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-title text-fg-primary'>{title}</h2>
      {children}
    </section>
  );
}
