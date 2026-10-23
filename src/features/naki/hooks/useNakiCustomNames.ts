import { useQuery } from '@tanstack/react-query';
import { listAllRecordsNewestFirst } from '@/features/records/api/recordStore';
import { recordKeys } from '@/features/records/hooks/recordKeys';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { collectCustomNames, EMPTY_CUSTOM_NAMES } from '../nakiCustomNames';

// 나키 질문에 실어 보낼 사용자가 만든 분류·태그 이름 (기기 사본에서 모은다, nakiCustomNames).
// 질문할 때마다 사본 전체를 읽지 않게 캐시해 두고, 기록이 바뀌면(recordKeys.all 무효화) 다시 모은다.
// 아직 못 모았으면 빈 목록으로 보낸다: 이름이 없어도 나키는 동작한다(모르는 말은 검색어로 찾는다)
export function useNakiCustomNames(types: readonly RecordType[]) {
  const query = useQuery({
    queryKey: recordKeys.customNames(types),
    queryFn: async () =>
      collectCustomNames(await listAllRecordsNewestFirst(), types),
  });
  return query.data ?? EMPTY_CUSTOM_NAMES;
}
