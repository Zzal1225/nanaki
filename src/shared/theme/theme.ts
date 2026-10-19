export const THEME_STORAGE_KEY = 'nanaki-theme';
export const THEME_CHANGE_EVENT = 'nanaki-theme-change';
export const DARK_CLASS_NAME = 'dark';
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export const DEFAULT_THEME_CHOICE: ThemeChoice = 'system';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return THEME_CHOICES.some((choice) => choice === value);
}

// themeInitScript.ts의 문자열 스크립트도 같은 규칙으로 판단해야 한다
export function resolveIsDark(
  choice: ThemeChoice,
  doesSystemPreferDark: boolean,
): boolean {
  if (choice === 'system') return doesSystemPreferDark;
  return choice === 'dark';
}

// 시크릿 모드·저장소 차단 환경에서는 localStorage 접근이 예외를 던질 수 있다
export function readStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : DEFAULT_THEME_CHOICE;
  } catch {
    return DEFAULT_THEME_CHOICE;
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const doesSystemPreferDark = matchMedia(DARK_MEDIA_QUERY).matches;
  document.documentElement.classList.toggle(
    DARK_CLASS_NAME,
    resolveIsDark(choice, doesSystemPreferDark),
  );
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // 저장이 막혀도 이번 방문 동안은 전환되어야 하므로 아래 적용은 계속한다
  }
  // 같은 탭에서는 storage 이벤트가 오지 않아서 직접 알린다
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
