import type { ImportResult } from './api/backupStore';

// 불러오기 결과 한 줄 (설정 > 데이터). 몇 개를 더했고, 무엇을 왜 뺐는지까지 말한다:
// "없는 것만 더하기"라 0개를 더해도 실패가 아니다 (같은 파일을 다시 불러온 경우)
export function importResultMessage(result: ImportResult): string {
  const parts = [
    result.added > 0 ? `${result.added}개를 더했어요` : '더할 것이 없어요',
    result.skipped > 0 ? `이미 있는 ${result.skipped}개는 건너뛰었어요` : null,
    result.invalid > 0 ? `읽지 못한 ${result.invalid}개는 뺐어요` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

// 설정 > 데이터의 개수 줄 (시안: "기록 312개 · 사진 48장"). 사진 수를 모르면(오프라인) 기록만
export function dataCountText(records: number, photos: number | null): string {
  return photos === null
    ? `기록 ${records}개`
    : `기록 ${records}개 · 사진 ${photos}장`;
}
