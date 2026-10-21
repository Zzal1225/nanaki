// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BodySummaryCard from './BodySummaryCard';

// 체형 요약 카드는 화면 비교(4화면) 대상이 아니라서, 무엇이 보이고 읽히는지만 여기서 확인한다
describe('BodySummaryCard', () => {
  afterEach(() => cleanup());

  it('마지막 체중·이 달 변화·그래프 설명·다른 항목 칩', () => {
    render(
      <BodySummaryCard
        monthLabel='이번 달'
        summary={{
          latestWeight: 68.4,
          change: -1.2,
          points: [
            { day: 1, weight: 69.6 },
            { day: 19, weight: 68.4 },
          ],
          daysInMonth: 31,
          latestOthers: [{ label: '허리', value: 78, unit: 'cm' }],
        }}
      />,
    );
    expect(screen.getByText('68.4kg')).toBeTruthy();
    expect(screen.getByText('-1.2kg')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: '체중 그래프: 1일 69.6kg에서 19일 68.4kg',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('listitem').textContent).toBe('허리78cm');
  });

  it('늘었으면 +, 같으면 "변화 없음"', () => {
    const base = {
      latestWeight: 70,
      points: [{ day: 3, weight: 70 }],
      daysInMonth: 31,
      latestOthers: [],
    };
    render(
      <BodySummaryCard monthLabel='10월' summary={{ ...base, change: 0.4 }} />,
    );
    expect(screen.getByText('+0.4kg')).toBeTruthy();
    cleanup();
    render(
      <BodySummaryCard monthLabel='10월' summary={{ ...base, change: 0 }} />,
    );
    expect(screen.getByText('변화 없음')).toBeTruthy();
  });

  it('기록이 없는 달은 — 이고 그래프를 그리지 않는다', () => {
    render(
      <BodySummaryCard
        monthLabel='9월'
        summary={{
          latestWeight: null,
          change: null,
          points: [],
          daysInMonth: 30,
          latestOthers: [],
        }}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
