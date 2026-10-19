import {
  DARK_CLASS_NAME,
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from './theme';

// React가 로드되기 전, 첫 화면을 그리기 전에 실행되어 깜빡임을 막는다.
// 브라우저가 문자열로 실행하므로 theme.ts의 함수를 import해 쓸 수 없고 같은 규칙을 다시 적는다:
// 'dark'면 다크, 'light'면 라이트, 그 외(system·값 없음·잘못된 값)는 OS 설정을 따른다
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=c==="dark"||(c!=="light"&&matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches);document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS_NAME)},d)}catch(e){}})()`;
