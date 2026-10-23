import { PhotoInputError } from '../api/photoStore';

// 사용자에게 보여 줄 실패 문구: 형식·로그인처럼 알 수 있는 것은 그대로, 나머지(네트워크·저장소)는 다시 시도 안내
export function photoErrorMessage(error: unknown): string {
  return error instanceof PhotoInputError
    ? error.message
    : '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요';
}
