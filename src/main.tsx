import { StrictMode } from 'react'; // React의 개발 모드 도우미(개발 중에 잠재적 문제를 찾아주는 도구)
import { createRoot } from 'react-dom/client'; // DOM에 React를 연결
import './index.css'; // 전역 스타일
import App from './App.tsx'; // 메인 앱 컴포넌트

//createRoot는 React 18부터 도입된 새로운 메서드로, 이전의 ReactDOM.render() 대신 사용됨
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
