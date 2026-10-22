'use client';

// 'use client' 이유: QueryClient는 캐시(상태)를 들고 있고, Provider는 React Context라서 서버 컴포넌트에서 쓸 수 없다
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { LOCAL_DB_CHANGED_EVENT } from '@/lib/db/currentLocalDb';

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
            // 'always': 오프라인이어도 조회 함수를 실행한다. 기본값('online')은 오프라인이면 조회를 멈춰 두어
            // 화면이 회색 자리에 머물렀다 (25a 오프라인 실험). 기록·루틴 조회는 기기 사본에서 읽으므로
            // 네트워크가 없어도 끝난다 (동기화는 기다리지 않거나 3초까지만. 온라인 처음 방문만 다 받을 때까지, lib/db/currentLocalDb syncForRead)
            networkMode: 'always',
          },
          // 저장(만들기·고치기·지우기)도 오프라인에서 실행한다: 기기 사본과 대기열에 쓰고 끝난다 (25c).
          // 기본값('online')이면 오프라인에서 저장 버튼이 눌린 채 멈춘다
          mutations: {
            networkMode: 'always',
          },
        },
      }),
  );

  // 조회가 동기화를 기다리다 3초를 넘겨 사본으로 먼저 그렸을 때, 동기화가 끝나면 다시 그린다.
  // 모든 조회를 무효화한다: 바뀐 표(기록·루틴)에 딸린 키를 하나하나 고르기보다 단순하고,
  // 다시 부르는 조회는 사본에서 읽거나(빠름) 5초 안 재동기화를 건너뛰어서 서버 요청이 몰리지 않는다
  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries();
    window.addEventListener(LOCAL_DB_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LOCAL_DB_CHANGED_EVENT, refresh);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
