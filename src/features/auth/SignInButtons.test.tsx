// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addSampleRecords } from '@/features/records/sample/addSampleRecords';
import { signInAsGuest } from './authActions';
import SignInButtons from './SignInButtons';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('./authActions', () => ({
  signInAsGuest: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
// 구글 버튼은 next/font(Roboto)를 불러오는데, 글꼴 로더는 Next 빌드에서만 동작해 테스트에서는 오류가 난다.
// 이 테스트는 체험하기만 보므로 모양 없는 버튼으로 바꾼다
vi.mock('./GoogleSignInButton', () => ({
  default: (props: ComponentProps<'button'>) => (
    <button type='button' {...props}>
      Google로 시작하기
    </button>
  ),
}));
vi.mock('@/features/records/sample/addSampleRecords', () => ({
  addSampleRecords: vi.fn(),
}));

describe('SignInButtons 체험하기', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addSampleRecords).mockResolvedValue();
  });
  afterEach(() => cleanup());

  it('로그인되면 예시 기록을 넣은 뒤 홈으로', async () => {
    vi.mocked(signInAsGuest).mockResolvedValue(null);
    render(<SignInButtons />);

    fireEvent.click(
      screen.getByRole('button', { name: '로그인 없이 체험하기' }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    // 홈이 기록을 불러오기 전에 예시가 들어가 있어야 해서, 넣는 것이 먼저다
    expect(
      vi.mocked(addSampleRecords).mock.invocationCallOrder[0],
    ).toBeLessThan(replace.mock.invocationCallOrder[0]);
  });

  it('로그인에 실패하면 예시를 넣지 않고 안내만', async () => {
    vi.mocked(signInAsGuest).mockResolvedValue(
      new Error('막힘') as Awaited<ReturnType<typeof signInAsGuest>>,
    );
    render(<SignInButtons />);

    fireEvent.click(
      screen.getByRole('button', { name: '로그인 없이 체험하기' }),
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(addSampleRecords).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
