import { useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME_CHOICE,
  THEME_CHANGE_EVENT,
  readStoredTheme,
  type ThemeChoice,
} from './theme';

function subscribe(onChange: () => void): () => void {
  // storage: 다른 탭에서 바꿨을 때, THEME_CHANGE_EVENT: 같은 탭에서 바꿨을 때
  window.addEventListener('storage', onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

// 서버에는 localStorage가 없어서 기본값을 돌려준다. 하이드레이션 뒤 React가 실제 값으로 다시 그린다
function getServerSnapshot(): ThemeChoice {
  return DEFAULT_THEME_CHOICE;
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readStoredTheme, getServerSnapshot);
}
