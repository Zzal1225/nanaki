import { useId, type ReactNode } from 'react';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

// 설정의 묶음 하나: 작은 제목 + 카드 (시안 8a "기록 타입", "화면", "정보").
// section + aria-labelledby로 화면 읽기 프로그램이 묶음 단위로 건너뛸 수 있다
export default function SettingsSection({
  title,
  children,
}: SettingsSectionProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className='flex flex-col gap-2'>
      <h2 id={titleId} className='px-1 text-caption text-fg-secondary'>
        {title}
      </h2>
      <div className='overflow-hidden rounded-lg bg-surface shadow-card'>
        {children}
      </div>
    </section>
  );
}
