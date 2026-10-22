// 루틴 캐시의 이름표. 'routines'를 맨 앞에 두어 ['routines'] 하나로 목록·상세를 한 번에 무효화한다
// (기록의 recordKeys와 같은 계층 구조)
export const routineKeys = {
  all: ['routines'] as const,
  list: () => [...routineKeys.all, 'list'] as const,
  detail: (id: string) => [...routineKeys.all, 'detail', id] as const,
};
