import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { countPhotos } from '@/features/photos/api/photoStore';
import { listAllRecordsNewestFirst } from '@/features/records/api/recordStore';
import { recordKeys } from '@/features/records/hooks/recordKeys';
import { LOCAL_DB_CHANGED_EVENT } from '@/lib/db/currentLocalDb';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { exportBackup, importBackup } from '../api/backupStore';
import { backupFileName, type ParsedBackup } from '../backupFile';

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

// 파일로 내려받기. a[download]: 휴대폰은 파일 앱(아이폰)·다운로드(안드로이드), PC는 다운로드 폴더에 저장된다.
// 주소는 클릭 뒤 바로 닫는다 (파일이 메모리에 남지 않게)
function downloadJson(value: unknown, name: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// 백업 파일 저장하기 (설정 > 데이터, 계정 삭제 확인 창)
export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const file = await exportBackup(now);
      downloadJson(file, backupFileName(toLocalDateString(now)));
      return file.records.length;
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
