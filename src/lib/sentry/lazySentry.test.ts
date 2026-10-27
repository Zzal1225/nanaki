import { describe, expect, it, vi } from 'vitest';
import { createLazySentry, type SentryLike } from './lazySentry';

// 진짜 window 대신 이벤트만 주고받는 가짜. 늦게 켜기의 핵심은 "켜지기 전 오류를 잃지 않기"라 그것만 본다
function createTarget() {
  const target = new EventTarget();
  return target as unknown as Window & EventTarget;
}

function createFakeSentry() {
  return {
    captureException: vi.fn(),
    captureRouterTransitionStart: vi.fn(),
  } as unknown as SentryLike & {
    captureException: ReturnType<typeof vi.fn>;
    captureRouterTransitionStart: ReturnType<typeof vi.fn>;
  };
}

function fireError(target: EventTarget, error: Error) {
  const event = new Event('error') as Event & { error: Error };
  event.error = error;
  target.dispatchEvent(event);
}

describe('createLazySentry', () => {
  it('켜지기 전에 난 오류를 모아 두었다가 켜지면 보낸다', async () => {
    const target = createTarget();
    const fake = createFakeSentry();
    const sentry = createLazySentry(async () => fake, target);

    const early = new Error('첫 화면 중 오류');
    fireError(target, early);
    expect(fake.captureException).not.toHaveBeenCalled();

    await sentry.start();
    expect(fake.captureException).toHaveBeenCalledWith(early);
  });

  it('켜진 뒤에는 모으지 않는다 (Sentry가 직접 받아 두 번 가지 않게)', async () => {
    const target = createTarget();
    const fake = createFakeSentry();
    const sentry = createLazySentry(async () => fake, target);
    await sentry.start();

    fireError(target, new Error('켜진 뒤 오류'));
    await sentry.start();
    expect(fake.captureException).not.toHaveBeenCalled();
  });

  it('여러 번 불러도 한 번만 받는다', async () => {
    const load = vi.fn(async () => createFakeSentry());
    const sentry = createLazySentry(load, createTarget());
    await Promise.all([sentry.start(), sentry.start()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('받기에 실패하면 다음 보고 때 다시 시도하고, 모아 둔 오류도 그때 보낸다', async () => {
    const target = createTarget();
    const fake = createFakeSentry();
    const load = vi
      .fn<() => Promise<SentryLike>>()
      .mockRejectedValueOnce(new Error('오프라인'))
      .mockResolvedValue(fake);
    const sentry = createLazySentry(load, target);

    const early = new Error('먼저 난 오류');
    fireError(target, early);
    await expect(sentry.start()).rejects.toThrow('오프라인');

    const later = new Error('나중 오류');
    sentry.captureException(later);
    await vi.waitFor(() =>
      expect(fake.captureException).toHaveBeenCalledWith(later),
    );
    expect(fake.captureException).toHaveBeenCalledWith(early);
  });

  it('켜지기 전 화면 이동 기록은 건너뛴다 (오류를 내지 않는다)', async () => {
    const fake = createFakeSentry();
    const sentry = createLazySentry(async () => fake, createTarget());
    sentry.captureRouterTransitionStart('/records', 'push');
    expect(fake.captureRouterTransitionStart).not.toHaveBeenCalled();

    await sentry.start();
    sentry.captureRouterTransitionStart('/records', 'push');
    expect(fake.captureRouterTransitionStart).toHaveBeenCalledWith(
      '/records',
      'push',
    );
  });
});
