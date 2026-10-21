import { useVisibleTypes } from '@/features/settings/hooks/useUserSettings';
import { getNewRecordMenuItems } from './newRecordMenu';

// 켜진 타입만 담은 작성 메뉴. 스피드 다이얼·사이드바 "새 기록"·빈 상태 "기록 추가하기"가 같은 목록을 쓴다.
// date: 홈에서 고른 날로 시작하는 메뉴(빈 날 상태)
export function useNewRecordMenuItems(date?: string) {
  return getNewRecordMenuItems(useVisibleTypes(), date);
}
