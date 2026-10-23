import { describe, expect, it } from 'vitest';
import { parsePushPayload } from '@/lib/pushPayload';
import { buildReminderPayload, isGoneStatus } from './routineReminder';

const BASE = {
  routine_id: 'r1',
  user_id: 'u1',
  routine_name: '물 마시기',
  done_count: 0,
  day: '2026-10-23',
};

describe('루틴 알림 내용', () => {
  it('체크형: 루틴 이름 + 아직 안 했다, 누르면 그날 홈', () => {
    expect(buildReminderPayload({ ...BASE, goal: { kind: 'check' } })).toEqual({
      title: '물 마시기',
      body: '오늘 아직 안 했어요',
      url: '/?date=2026-10-23',
      tag: 'routine-r1',
    });
  });

  it('횟수형: 하나도 안 했으면 목표를, 조금 했으면 지금까지', () => {
    const goal = { kind: 'count', target: 8, unit: '잔' };
    expect(buildReminderPayload({ ...BASE, goal }).body).toBe(
      '오늘 아직 안 했어요 (목표 8잔)',
    );
    expect(buildReminderPayload({ ...BASE, goal, done_count: 3 }).body).toBe(
      '오늘 3/8잔 했어요. 마저 채워 볼까요?',
    );
    expect(
      buildReminderPayload({
        ...BASE,
        goal: { kind: 'count', target: 3, unit: '' },
      }).body,
    ).toBe('오늘 아직 안 했어요 (목표 3회)');
  });

  it('앱 서비스 워커가 그대로 읽는 모양이다 (src/lib/pushPayload)', () => {
    const payload = buildReminderPayload({ ...BASE, goal: { kind: 'check' } });
    expect(parsePushPayload(JSON.parse(JSON.stringify(payload)))).toEqual(
      payload,
    );
  });

  it('404·410은 없어진 구독 (지운다), 그 밖의 실패는 남긴다', () => {
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(429)).toBe(false);
    expect(isGoneStatus(500)).toBe(false);
  });
});
