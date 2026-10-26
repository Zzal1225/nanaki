// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSplash from './AppSplash';
import {
  SPLASH_CONTINUE_KEY,
  SPLASH_LEAVE_MS,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  SPLASH_SETTLE_MS,
  SPLASH_SKIP_ATTR,
} from './splashRules';

// 화면 하나가 데이터를 받는 흉내: resolve를 부르기 전까지 요청이 진행 중이다
let resolveData: (value: string) => void = () => {};
function FakeScreen() {
  useQuery({
    queryKey: ['fake'],
    queryFn: () =>
      new Promise<string>((resolve) => {
        resolveData = resolve;
      }),
  });
  return null;
}

function renderSplash({ withQuery }: { withQuery: boolean }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      {withQuery && <FakeScreen />}
      <AppSplash />
    </QueryClientProvider>,
  );
}

const splash = () => screen.queryByRole('status');

// 타이머 → 상태 바꿈 → effect가 다음 타이머를 건다. act 하나 안에서는 effect가 act가 끝날 때 돌아서
// 한 번에 크게 흘리면 다음 타이머가 그 시간 안에 걸리지 않는다 → 잘게 나눠 흘린다
const STEP_MS = 10;
// 다음 타이머는 그 단계가 끝난 때부터 걸리니 단계마다 최대 STEP_MS씩 늦어진다 (타이머 3개가 이어진다)
const MARGIN_MS = STEP_MS * 3;
async function advance(ms: number) {
  for (let passed = 0; passed < ms; passed += STEP_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(STEP_MS, ms - passed));
    });
  }
  if (ms === 0) await act(async () => {});
}

describe('AppSplash (앱을 열 때의 로딩 화면)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 테스트에서는 브라우저에서 처음부터 그린다(하이드레이션 없음) → 보이기 시작한 때 = 지금(0)
    vi.spyOn(performance, 'now').mockReturnValue(0);
    sessionStorage.clear();
    document.documentElement.removeAttribute(SPLASH_SKIP_ATTR);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('요청이 없어도 최소 1초는 보이고, 그 뒤 사라진다', async () => {
    renderSplash({ withQuery: false });
    expect(splash()).not.toBeNull();
    await advance(SPLASH_MIN_MS - 1);
    expect(splash()).not.toBeNull();
    await advance(1 + SPLASH_SETTLE_MS + SPLASH_LEAVE_MS + MARGIN_MS);
    expect(splash()).toBeNull();
  });

  it('1초가 지나도 데이터가 오는 중이면 기다렸다가, 오면 사라진다', async () => {
    renderSplash({ withQuery: true });
    await advance(SPLASH_MIN_MS * 3);
    expect(splash()).not.toBeNull();
    await act(async () => resolveData('done'));
    await advance(SPLASH_SETTLE_MS + SPLASH_LEAVE_MS + MARGIN_MS);
    expect(splash()).toBeNull();
  });

  it('데이터가 끝나지 않아도 8초가 지나면 화면을 보여 준다', async () => {
    renderSplash({ withQuery: true });
    await advance(SPLASH_MAX_MS - 1);
    expect(splash()).not.toBeNull();
    await advance(1 + SPLASH_LEAVE_MS + MARGIN_MS);
    expect(splash()).toBeNull();
  });

  it('오프라인이면 처음부터 보여 주지 않는다', async () => {
    // 오프라인으로 열면 <head> 스크립트(SPLASH_INIT_SCRIPT)가 붙이는 표시
    document.documentElement.setAttribute(SPLASH_SKIP_ATTR, '');
    renderSplash({ withQuery: true });
    await advance(0);
    expect(splash()).toBeNull();
  });

  it('로그인 버튼을 누르고 왔으면 등장 동작 없이 이어지고, 사라진 뒤 표시를 지운다', async () => {
    sessionStorage.setItem(SPLASH_CONTINUE_KEY, '1');
    renderSplash({ withQuery: false });
    expect(splash()?.hasAttribute('data-continued')).toBe(true);
    await advance(
      SPLASH_MIN_MS + SPLASH_SETTLE_MS + SPLASH_LEAVE_MS + MARGIN_MS,
    );
    expect(splash()).toBeNull();
    expect(sessionStorage.getItem(SPLASH_CONTINUE_KEY)).toBeNull();
  });
});
