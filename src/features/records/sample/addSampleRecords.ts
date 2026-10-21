import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { createRecords } from '../api/recordStore';
import { buildSampleRecords } from './sampleRecords';

// 체험 계정에 예시 기록을 넣는다. 실패해도 체험은 그대로 시작한다 (빈 화면으로 둘러보는 게, 들어가지 못하는 것보다 낫다).
// 오늘은 이 브라우저의 날짜: 서버(UTC)의 오늘을 쓰면 한국 오전 9시 전에는 하루 밀린다.
// 이 함수는 클릭 처리 안에서만 불려서 new Date()를 써도 된다 (렌더 중에 부르면 서버·브라우저 값이 어긋난다)
export async function addSampleRecords(): Promise<void> {
  try {
    await createRecords(buildSampleRecords(toLocalDateString(new Date())));
  } catch (error) {
    console.warn('[sample] 체험 예시 기록을 넣지 못함', error);
  }
}
