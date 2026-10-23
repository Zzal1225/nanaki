// 루틴 알림 내용 만들기 (35b). Edge Function(Deno)이 쓰고, Deno·Node 어디서도 도는 순수 함수라 앱의 vitest가 테스트한다.
// 알림 모양 { title, body, url, tag }은 앱 서비스 워커가 읽는 모양과 같다 (src/lib/pushPayload.ts)

export type DueReminder = {
  routine_id: string;
  user_id: string;
  routine_name: string;
  // 루틴 목표 {"kind":"check"} 또는 {"kind":"count","target":8,"unit":"잔"} (DB jsonb 그대로)
  goal: unknown;
  done_count: number;
  // 한국 날짜 'YYYY-MM-DD'
  day: string;
};

export type ReminderPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

const DEFAULT_COUNT_UNIT = '회';

function readCountGoal(goal: unknown): { target: number; unit: string } | null {
  if (typeof goal !== 'object' || goal === null) return null;
  const value = goal as Record<string, unknown>;
  if (value.kind !== 'count' || typeof value.target !== 'number') return null;
  const unit =
    typeof value.unit === 'string' && value.unit.trim()
      ? value.unit
      : DEFAULT_COUNT_UNIT;
  return { target: value.target, unit };
}

// 제목 = 루틴 이름, 본문 = 아직 안 했다는 것(횟수형은 지금까지 한 만큼). 단위 뒤에 조사를 붙이지 않는다("8잔이에요/3회예요" 받침 따지기를 피한다). 누르면 그날 홈(하루 요약에서 바로 체크)
// tag = 루틴마다: 같은 루틴 알림이 다시 오면 쌓이지 않고 바뀐다
export function buildReminderPayload(reminder: DueReminder): ReminderPayload {
  const count = readCountGoal(reminder.goal);
  const body = count
    ? reminder.done_count > 0
      ? `오늘 ${reminder.done_count}/${count.target}${count.unit} 했어요. 마저 채워 볼까요?`
      : `오늘 아직 안 했어요 (목표 ${count.target}${count.unit})`
    : '오늘 아직 안 했어요';
  return {
    title: reminder.routine_name,
    body,
    url: `/?date=${reminder.day}`,
    tag: `routine-${reminder.routine_id}`,
  };
}

// 푸시 서비스가 "이 구독은 없다"고 답한 것: 410 Gone(정식), 404(일부 서비스). 이 구독 줄은 지운다 (CLAUDE.md)
export function isGoneStatus(status: number): boolean {
  return status === 404 || status === 410;
}
