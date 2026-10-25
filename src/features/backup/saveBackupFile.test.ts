// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBackupFile, toBackupFile } from './saveBackupFile';

// 아이폰처럼: 손가락 기기 + 파일 공유 지원
function stubPhone(share: () => Promise<void>) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: query === '(pointer: coarse)' })),
  );
  Object.assign(navigator, { canShare: () => true, share: vi.fn(share) });
}

describe('백업 파일 저장 방법 (2026-10-25 아이폰 확인 12)', () => {
  const file = toBackupFile({ app: 'nanaki' }, 'nanaki-backup-2026-10-25.json');
  let click: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:backup');
    URL.revokeObjectURL = vi.fn();
    click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it('PC(공유 없음)는 내려받는다', async () => {
    expect(await saveBackupFile(file)).toBe('downloaded');
    expect(click).toHaveBeenCalled();
  });

  it('아이폰은 공유 시트를 연다 ("파일에 저장"으로 보이는 폴더를 고르게)', async () => {
    stubPhone(() => Promise.resolve());
    expect(await saveBackupFile(file)).toBe('shared');
    expect(navigator.share).toHaveBeenCalledWith({
      files: [file],
      title: file.name,
    });
    expect(click).not.toHaveBeenCalled();
  });

  it('공유 시트를 닫으면 취소, 버튼을 누른 지 오래돼 막히면 한 번 더 누르게', async () => {
    stubPhone(() => Promise.reject(new DOMException('', 'AbortError')));
    expect(await saveBackupFile(file)).toBe('cancelled');
    stubPhone(() => Promise.reject(new DOMException('', 'NotAllowedError')));
    expect(await saveBackupFile(file)).toBe('needsTap');
    expect(click).not.toHaveBeenCalled();
  });
});
