'use client';

// 'use client' 이유: QueryClient는 캐시(상태)를 들고 있고, Provider는 React Context라서 서버 컴포넌트에서 쓸 수 없다
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

// 캐시를 이 시간 동안은 새것으로 믿고 다시 불러오지 않는다.
// 내 기기에서 바꾼 기록은 저장 직후 무효화로 바로 반영된다.
// 다른 기기에서 바꾼 기록은 자동으로 들어오지 않고, 데이터가 1분보다 오래된 상태에서
// 창에 다시 돌아오거나(포커스) 화면을 다시 열 때 새로 불러와 반영된다
export const STALE_TIME_MS = 60_000;

export default function QueryProvider({ children }: { children: ReactNode }) {
  // useState로 한 번만 만든다. 컴포넌트 밖에 두면 서버에서 여러 사용자의 요청이 한 캐시를 나눠 쓰고,
  // 렌더 안에서 그냥 new 하면 렌더마다 캐시가 새로 만들어져 사라진다
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME_MS,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
