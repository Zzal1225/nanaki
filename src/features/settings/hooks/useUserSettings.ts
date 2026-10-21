import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RECORD_TYPE_ORDER } from '@/features/records/entry/newRecordMenu';
import type { RecordType } from '@/features/records/schema/recordTypes';
import { useToastStore } from '@/shared/toast/toastStore';
import {
  getUserSettings,
  updateHiddenTypes,
  type UserSettings,
} from '../api/settingsStore';
import { getVisibleTypes } from '../typeVisibility';

// 기록 캐시(['records'])와 따로 둔다: 기록을 무효화할 때 설정까지 다시 부르지 않게
export const settingsKeys = {
  all: ['settings'] as const,
};

export function useUserSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getUserSettings });
}

// 켜진 타입. 작성 메뉴·기록 탭·캘린더가 이것만 본다.
// 설정을 불러오기 전이나 불러오지 못했을 때는 모두 켜진 것으로 본다:
// 메뉴가 비어 아무것도 쓸 수 없는 것보다, 숨긴 타입이 잠깐 보이는 편이 낫다
export function useVisibleTypes(): readonly RecordType[] {
  const hiddenTypes = useUserSettings().data?.hiddenTypes;
  // 렌더마다 새 배열을 주면 이 값을 useMemo 의존성으로 쓰는 화면(캘린더)이 매번 다시 계산한다.
  // 캐시의 hiddenTypes 배열은 다시 불러와 내용이 같으면 TanStack이 같은 참조를 유지한다 (structural sharing)
  return useMemo(
    () => (hiddenTypes ? getVisibleTypes(hiddenTypes) : RECORD_TYPE_ORDER),
    [hiddenTypes],
  );
}

// 숨긴 타입 목록 저장. 스위치는 누르는 즉시 바뀌어야 자연스러워서 낙관적 업데이트:
// 캐시를 먼저 바꿔 화면에 반영하고, 저장이 실패하면 이전 값으로 되돌린 뒤 알린다
export function useUpdateHiddenTypes() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: updateHiddenTypes,
    onMutate: async (hiddenTypes) => {
      // 진행 중인 조회가 늦게 도착해 방금 바꾼 값을 덮어쓰지 않게 먼저 멈춘다
      await queryClient.cancelQueries({ queryKey: settingsKeys.all });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.all);
      queryClient.setQueryData<UserSettings>(settingsKeys.all, {
        hiddenTypes,
      });
      return { previous };
    },
    onError: (_error, _hiddenTypes, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.all, context.previous);
      }
      showToast({ message: '설정을 저장하지 못했어요. 다시 시도해 주세요.' });
    },
    // 성공·실패 모두 서버 값으로 맞춘다 (다른 기기에서 동시에 바꾼 경우 포함)
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
