import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useToastStore } from '@/shared/toast/toastStore';
import { deleteRecord, restoreRecord } from '../api/recordStore';
import { recordKeys } from './recordKeys';

type ShowToast = ReturnType<typeof useToastStore.getState>['showToast'];

// 되돌리기 버튼은 상세 화면이 사라진(홈으로 이동한) 뒤에 눌린다.
// 그래서 컴포넌트에 묶인 훅이 아니라, 앱에 하나뿐인 queryClient와 토스트 함수만 쓰는 보통 함수로 둔다
async function undoDelete(
  queryClient: QueryClient,
  showToast: ShowToast,
  id: string,
) {
  try {
    await restoreRecord(id);
    await queryClient.invalidateQueries({ queryKey: recordKeys.all });
    // 홈에는 아직 기록 목록이 없어서, 되돌린 게 눈에 보이지 않으니 알려 준다
    showToast({ message: '기록을 되돌렸어요' });
  } catch {
    showToast({ message: '되돌리지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
}

// 기록 지우기 (소프트 삭제). 확인 창 없이 바로 지우고 5초 동안 되돌리기를 준다 (시안 6번)
export function useDeleteRecord() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: deleteRecord,
    onSuccess: (_result, id) => {
      showToast({
        message: '기록을 삭제했어요',
        action: {
          label: '되돌리기',
          onAction: () => void undoDelete(queryClient, showToast, id),
        },
      });
      // 작성·수정과 달리 무효화를 기다리지(return) 않는다. 지우면 바로 다른 화면으로 떠나는데,
      // 기다리면 그 사이 상세가 다시 불러와져 "기록을 찾을 수 없어요"가 잠깐 비친다
      void queryClient.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}
