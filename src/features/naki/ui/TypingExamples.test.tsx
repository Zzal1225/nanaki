// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TypingExamples from './TypingExamples';

const QUESTIONS = ['지난달 외식비 얼마였어?', '이번 주 운동 몇 번 했어?'];

function stubReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

// 한 글자마다 다시 그린 뒤 다음 타이머가 걸린다 → 글자 수만큼 한 칸씩 흘려 보낸다
function typeChars(count: number) {
  for (let i = 0; i < count; i += 1) {
    act(() => vi.advanceTimersByTime(45));
  }
}

describe('TypingExamples (빈 화면 예시 질문)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('처음엔 없고, 한 글자씩 차례로 나타난다. 화면 읽기 이름은 늘 완성된 문장', () => {
    stubReducedMotion(false);
    render(<TypingExamples questions={QUESTIONS} onPick={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    typeChars(3);
    const first = screen.getByRole('button', { name: QUESTIONS[0] });
    expect(first.textContent).toBe('지난달');
    // 두 번째는 아직 차례가 아니다
    expect(screen.queryAllByRole('button')).toHaveLength(1);

    typeChars(60);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
      QUESTIONS,
    );
  });

  it('타이핑 중에 눌러도 완성된 질문을 보낸다', () => {
    stubReducedMotion(false);
    const onPick = vi.fn();
    render(<TypingExamples questions={QUESTIONS} onPick={onPick} />);
    typeChars(2);
    fireEvent.click(screen.getByRole('button', { name: QUESTIONS[0] }));
    expect(onPick).toHaveBeenCalledWith('지난달 외식비 얼마였어?');
  });

  it('동작 줄이기 설정이면 처음부터 다 보인다', () => {
    stubReducedMotion(true);
    render(<TypingExamples questions={QUESTIONS} onPick={vi.fn()} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
      QUESTIONS,
    );
  });
});
