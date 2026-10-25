import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { countPhotos } from '@/features/photos/api/photoStore';
import { listAllRecordsNewestFirst } from '@/features/records/api/recordStore';
import { recordKeys } from '@/features/records/hooks/recordKeys';
import { LOCAL_DB_CHANGED_EVENT } from '@/lib/db/currentLocalDb';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { exportBackup, importBackup } from '../api/backupStore';
import { backupFileName, type ParsedBackup } from '../backupFile';
import { saveBackupFile, toBackupFile } from '../saveBackupFile';

// 기록 수는 기기 사본에서 (오프라인에서도), 사진 수는 서버에서 (온라인일 때만).
// 기록 키 아래에 둬서 기록을 쓰거나 지우면 같이 다시 센다
export function useDataCounts(isOnline: boolean) {
  const records = useQuery({
    queryKey: [...recordKeys.all, 'count'],
    queryFn: async () => (await listAllRecordsNewestFirst()).length,
  });
  const photos = useQuery({
    queryKey: ['photos', 'count'],
    queryFn: countPhotos,
    enabled: isOnline,
  });
  return { records: records.data ?? null, photos: photos.data ?? null };
}

// 백업 파일 저장하기 (설정 > 데이터, 계정 삭제 확인 창)
export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const backup = await exportBackup(now);
      const file = toBackupFile(backup, backupFileName(toLocalDateString(now)));
      // 저장 방법(아이폰 공유 시트 / 내려받기)과 결과는 saveBackupFile. 한 번 더 눌러야 하면 화면이 file을 들고 버튼을 보여 준다
      const outcome = await saveBackupFile(file);
      return { count: backup.records.length, outcome, file };
    },
  });
}

// 백업 파일 불러오기. 끝나면 모든 화면 데이터를 다시 읽는다 (기록·루틴·예산·고정지출이 한꺼번에 바뀐다)
export function useImportBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backup: ParsedBackup) => importBackup(backup),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      window.dispatchEvent(new Event(LOCAL_DB_CHANGED_EVENT));
    },
  });
}
