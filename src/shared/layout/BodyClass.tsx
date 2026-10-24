'use client';

// 'use client' 이유: <body>에 클래스를 붙이고 떼는 effect (useBodyClass). 서버 컴포넌트 화면(로그인)에서 쓰려고 컴포넌트로 감쌌다
import { useBodyClass } from './useBodyClass';

export default function BodyClass({ name }: { name: string }) {
  useBodyClass(name);
  return null;
}
