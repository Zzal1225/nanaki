import { createFixedExpense } from '@/features/fixedExpenses/api/fixedExpenseStore';
import { createRoutines } from '@/features/routines/api/routineStore';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import { createRecords } from '../api/recordStore';
import { buildSampleFixedExpenses } from './sampleFixedExpenses';
import { buildSampleRecords } from './sampleRecords';
import { buildSampleRoutines } from './sampleRoutines';

// 체험 계정에 예시 기록을 넣는다. 실패해도 체험은 그대로 시작한다 (빈 화면으로 둘러보는 게, 들어가지 못하는 것보다 낫다).
// 오늘은 이 브라우저의 날짜: 서버(UTC)의 오늘을 쓰면 한국 오전 9시 전에는 하루 밀린다.
// 이 함수는 클릭 처리 안에서만 불려서 new Date()를 써도 된다 (렌더 중에 부르면 서버·브라우저 값이 어긋난다)
export async function addSampleRecords(): Promise<void> {
  const today = toLocalDateString(new Date());
  const records = buildSampleRecords(today);

  // 루틴(규칙)을 먼저 넣고 그 id로 체크 기록을 만든다. 루틴을 못 넣으면 체크도 빼고 나머지 기록만 넣는다
  // (주인 없는 체크가 남지 않게)
  const { routines, checks } = buildSampleRoutines(today, {
    water: crypto.randomUUID(),
    stretch: crypto.randomUUID(),
  });
  let routineChecks = checks;
  try {
    await createRoutines(routines);
  } catch (error) {
    console.warn('[sample] 체험 예시 루틴을 넣지 못함', error);
    routineChecks = [];
  }

  try {
    await createRecords([...records, ...routineChecks]);
  } catch (error) {
    console.warn('[sample] 체험 예시 기록을 넣지 못함', error);
  }

  // 고정지출(규칙)은 기록과 따로라 실패해도 기록에 영향이 없다. 이번 달 지난 결제일은 기록하지 않는다(기본값)
  try {
    await Promise.all(
      buildSampleFixedExpenses(today).map((input) =>
        createFixedExpense(input, { today, includeCurrentMonth: false }),
      ),
    );
  } catch (error) {
    console.warn('[sample] 체험 예시 고정지출을 넣지 못함', error);
  }
}
