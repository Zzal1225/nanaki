// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BodySummaryCard from './BodySummaryCard';

const WEIGHTS = [
  { date: '2026-10-05', value: 69.2 },
  { date: '2026-10-19', value: 68.4 },
];

// 체형 요약 카드는 화면 비교(4화면) 대상이 아니라서, 무엇이 보이고 읽히는지만 여기서 확인한다
describe('BodySummaryCard', () => {
  afterEach(() => cleanup());

  it('"최근 체중 68.4kg(-0.4kg)", 체중·허리둘레 그래프를 따로', () => {
    render(
      <BodySummaryCard
        latestWeight={{ weight: 68.4, change: -0.4 }}
        summary={{
          points: {
            weight: WEIGHTS,
            waist: [{ date: '2026-10-12', value: 78 }],
          },
        }}
      />,
    );
    expect(screen.getByText('최근 체중')).toBeTruthy();
    expect(screen.getByText('(-0.4kg)').parentElement?.textContent).toBe(
      '68.4kg(-0.4kg)',
    );
    expect(
      screen.getByRole('img', {
        name: '체중 그래프: 10.5 69.2kg에서 10.19 68.4kg',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: '허리둘레 그래프: 10.12 78cm에서 10.12 78cm',
      }),
    ).toBeTruthy();
    // 예전 문구는 없다
    expect(screen.queryByText(/마지막 체중|이 달/)).toBeNull();
  });

  it('바로 전 체중이 없으면 괄호 없이, 늘었으면 +', () => {
    const summary = { points: { weight: WEIGHTS, waist: [] } };
    render(
      <BodySummaryCard
        latestWeight={{ weight: 70, change: null }}
        summary={summary}
      />,
    );
    expect(screen.queryByText(/\(/)).toBeNull();
    cleanup();
    render(
      <BodySummaryCard
        latestWeight={{ weight: 70, change: 0.4 }}
        summary={summary}
      />,
    );
    expect(screen.getByText('(+0.4kg)')).toBeTruthy();
  });

  it('체중 기록이 하나도 없으면 —, 그 달에 잰 적 없는 항목은 그래프를 그리지 않는다', () => {
    render(
      <BodySummaryCard
        latestWeight={null}
        summary={{ points: { weight: [], waist: [] } }}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
