import { useQuery } from '@tanstack/react-query';
import { listPendingRecordIds } from '../api/recordStore';
import { recordKeys } from './recordKeys';

// 아직 서버에 보내지 않은 기록 id (목록의 구름 아이콘, 시안 15a).
// 키가 'records' 아래라 저장·삭제 뒤 무효화에 함께 다시 읽고, 보내기가 끝나면
// LOCAL_DB_CHANGED_EVENT로 QueryProvider가 다시 읽게 한다 → 보내진 기록의 구름이 사라진다
export function usePendingRecordIds(): ReadonlySet<string> {
  const { data } = useQuery({
    queryKey: recordKeys.pending(),
    queryFn: listPendingRecordIds,
    // Set으로 바꿔 둔다: 목록 줄마다 has로 찾는다
    select: (ids) => new Set(ids),
  });
  return data ?? EMPTY;
}

const EMPTY: ReadonlySet<string> = new Set();
