import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isThisDeviceSubscribed,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type PushSetupResult,
} from '../api/pushStore';

export const pushKeys = {
  thisDevice: ['push', 'thisDevice'] as const,
};

// 이 기기의 알림 구독 상태 + 켜기·끄기.
// 켜기는 useMutation을 거치지 않고 버튼 처리 안에서 바로 부른다: mutation은 함수를 부르기 전에 다른 단계를 먼저 기다리는데,
// 아이폰은 버튼을 누른 직후가 아니면 알림 권한 요청을 무시할 수 있다 (pushStore.subscribeThisDevice 설명)
export function useThisDevicePush() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: pushKeys.thisDevice,
    queryFn: isThisDeviceSubscribed,
  });

  async function subscribe(): Promise<PushSetupResult> {
    const result = await subscribeThisDevice();
    await queryClient.invalidateQueries({ queryKey: pushKeys.thisDevice });
    return result;
  }

  async function unsubscribe(): Promise<void> {
    await unsubscribeThisDevice();
    await queryClient.invalidateQueries({ queryKey: pushKeys.thisDevice });
  }

  return { isSubscribed: status.data === true, subscribe, unsubscribe };
}
