'use client';

import { THEME_CHOICES, setThemeChoice, type ThemeChoice } from './theme';
import { useThemeChoice } from './useThemeChoice';

const THEME_LABELS: Record<ThemeChoice, string> = {
  system: '시스템',
  light: '라이트',
  dark: '다크',
};

// 'use client'인 이유: 클릭 이벤트와 브라우저에 저장된 값(useThemeChoice)을 쓰기 때문
export default function ThemeToggle() {
  const currentChoice = useThemeChoice();

  return (
    <div
      role='group'
      aria-label='화면 테마'
      className='inline-flex gap-1 rounded-md border border-border bg-surface p-1'
    >
      {THEME_CHOICES.map((choice) => {
        const isSelected = choice === currentChoice;
        return (
          <button
            key={choice}
            type='button'
            aria-pressed={isSelected}
            onClick={() => setThemeChoice(choice)}
            className={`min-h-11 rounded-sm px-3 text-body-sm ${
              isSelected
                ? 'bg-accent text-accent-foreground'
                : 'text-fg-secondary hover:bg-surface-hover active:bg-surface-pressed'
            }`}
          >
            {THEME_LABELS[choice]}
          </button>
        );
      })}
    </div>
  );
}
