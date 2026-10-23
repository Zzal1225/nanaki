import { describe, expect, it, vi } from 'vitest';
import {
  attachNewRecordPhotos,
  type AttachPhotosDeps,
  type PickedPhoto,
} from './attachNewRecordPhotos';

// recordStore·photoStore는 브라우저 저장소·Supabase를 불러서, 기본 의존성 모듈을 가짜로 막는다 (테스트는 deps를 직접 넘긴다)
vi.mock('@/features/records/api/recordStore', () => ({
  listPendingRecordIds: vi.fn(),
  sendPendingRecords: vi.fn(),
}));
vi.mock('./photoStore', () => ({ uploadPhoto: vi.fn() }));

const FRONT: PickedPhoto = {
  kind: 'front',
  file: new File(['f'], 'front.jpg', { type: 'image/jpeg' }),
};
const SIDE: PickedPhoto = {
  kind: 'side',
  file: new File(['s'], 'side.jpg', { type: 'image/jpeg' }),
};

function makeDeps(overrides: Partial<AttachPhotosDeps> = {}) {
  const calls: string[] = [];
  const deps: AttachPhotosDeps = {
    sendPending: vi.fn(async () => {
      calls.push('send');
    }),
    listPending: vi.fn(async () => {
      calls.push('list');
      return [];
    }),
    upload: vi.fn(async ({ kind }) => {
      calls.push(`upload:${kind}`);
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe('attachNewRecordPhotos (쓰기 화면 사진 붙이기)', () => {
  it('고른 사진이 없으면 아무것도 보내지 않는다', async () => {
    const { deps, calls } = makeDeps();
    expect(await attachNewRecordPhotos('r1', [], deps)).toEqual({
      status: 'done',
    });
    expect(calls).toEqual([]);
  });

  it('기록을 먼저 보내고, 서버에 간 것을 확인한 뒤 한 장씩 올린다', async () => {
    const { deps, calls } = makeDeps();
    const result = await attachNewRecordPhotos('r1', [FRONT, SIDE], deps);
    expect(result).toEqual({ status: 'done' });
    expect(calls).toEqual(['send', 'list', 'upload:front', 'upload:side']);
    expect(deps.upload).toHaveBeenCalledWith({
      recordId: 'r1',
      kind: 'front',
      file: FRONT.file,
    });
  });

  it('보낸 뒤에도 기록이 대기열에 남아 있으면(오프라인·거절) 올리지 않는다', async () => {
    const { deps } = makeDeps({
      sendPending: vi.fn().mockRejectedValue(new Error('offline')),
      listPending: vi.fn().mockResolvedValue(['r1']),
    });
    expect(await attachNewRecordPhotos('r1', [FRONT], deps)).toEqual({
      status: 'notOnServer',
    });
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it('대기열을 읽지 못하면 서버에 있다고 믿지 않는다', async () => {
    const { deps } = makeDeps({
      listPending: vi.fn().mockRejectedValue(new Error('idb')),
    });
    expect(await attachNewRecordPhotos('r1', [FRONT], deps)).toEqual({
      status: 'notOnServer',
    });
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it('한 장이 실패해도 다음 장은 올리고, 실패한 칸을 알려 준다', async () => {
    const { deps } = makeDeps({
      upload: vi.fn(async ({ kind }) => {
        if (kind === 'front') throw new Error('network');
      }),
    });
    expect(await attachNewRecordPhotos('r1', [FRONT, SIDE], deps)).toEqual({
      status: 'partial',
      failedKinds: ['front'],
    });
    expect(deps.upload).toHaveBeenCalledTimes(2);
  });
});
