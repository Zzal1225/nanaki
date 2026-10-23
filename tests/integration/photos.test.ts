import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAdminClient,
  deleteGuests,
  hasTestSupabase,
  newRecordRow,
  signInAsNewGuest,
  type TestGuest,
} from './testSupabase';

// step4 37a 사진 저장소: 비공개 버킷(photos)과 사진 표의 사용자 격리.
// 파일 주소 첫 폴더 = 주인, 표 줄은 내 기록에만, 버킷은 기기에서 바꾼 형식(WebP·JPEG)만

const webp = () =>
  new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });

describe.skipIf(!hasTestSupabase)('photos: 버킷과 표의 사용자 격리', () => {
  let alice: TestGuest;
  let bob: TestGuest;
  const aliceRecord = newRecordRow('앨리스 체형');
  const bobRecord = newRecordRow('밥 체형');

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAsNewGuest(), signInAsNewGuest()]);
    await alice.client.from('records').insert(aliceRecord);
    await bob.client.from('records').insert(bobRecord);
  });

  afterAll(() => deleteGuests(alice, bob));

  it('내 폴더에는 올리고 내려받고, 남의 폴더에는 올리지도 보지도 못한다', async () => {
    const path = `${alice.userId}/${crypto.randomUUID()}.webp`;
    const up = await alice.client.storage
      .from('photos')
      .upload(path, webp(), { contentType: 'image/webp' });
    expect(up.error).toBeNull();
    expect(
      (await alice.client.storage.from('photos').download(path)).error,
    ).toBeNull();

    expect(
      (await bob.client.storage.from('photos').download(path)).error,
    ).not.toBeNull();
    const intoAlice = await bob.client.storage
      .from('photos')
      .upload(`${alice.userId}/${crypto.randomUUID()}.webp`, webp(), {
        contentType: 'image/webp',
      });
    expect(intoAlice.error).not.toBeNull();
  });

  it('비공개 버킷: 로그인하지 않은 공개 주소로는 열리지 않고, 서명 링크로만', async () => {
    const path = `${alice.userId}/${crypto.randomUUID()}.webp`;
    await alice.client.storage
      .from('photos')
      .upload(path, webp(), { contentType: 'image/webp' });
    const { data: pub } = alice.client.storage
      .from('photos')
      .getPublicUrl(path);
    expect((await fetch(pub.publicUrl)).ok).toBe(false);

    const { data: signed } = await alice.client.storage
      .from('photos')
      .createSignedUrl(path, 60);
    expect(signed?.signedUrl).toBeTruthy();
    expect((await fetch(signed!.signedUrl)).ok).toBe(true);
  });

  it('기기에서 바꾼 형식(WebP·JPEG)이 아니면 버킷이 받지 않는다', async () => {
    const png = await alice.client.storage
      .from('photos')
      .upload(
        `${alice.userId}/${crypto.randomUUID()}.png`,
        new Blob([new Uint8Array([1])], { type: 'image/png' }),
        { contentType: 'image/png' },
      );
    expect(png.error).not.toBeNull();
  });

  it('사진 줄은 내 기록·내 폴더 주소로만 넣는다', async () => {
    const id = crypto.randomUUID();
    const mine = {
      id,
      record_id: aliceRecord.id,
      kind: 'front',
      path: `${alice.userId}/${id}.webp`,
      thumb_path: `${alice.userId}/${id}-thumb.webp`,
      width: 1200,
      height: 1600,
    };
    expect((await alice.client.from('photos').insert(mine)).error).toBeNull();
    expect(
      (await bob.client.from('photos').select('id').eq('id', id)).data,
    ).toEqual([]);

    const otherId = crypto.randomUUID();
    const onBobRecord = await alice.client.from('photos').insert({
      ...mine,
      id: otherId,
      record_id: bobRecord.id,
      path: `${alice.userId}/${otherId}.webp`,
      thumb_path: `${alice.userId}/${otherId}-thumb.webp`,
    });
    expect(onBobRecord.error).not.toBeNull();

    const thirdId = crypto.randomUUID();
    const bobFolder = await alice.client.from('photos').insert({
      ...mine,
      id: thirdId,
      path: `${bob.userId}/${thirdId}.webp`,
      thumb_path: `${bob.userId}/${thirdId}-thumb.webp`,
    });
    expect(bobFolder.error).not.toBeNull();
  });

  it('사진 파일이 있어도 계정을 지울 수 있고, 사진 줄은 함께 지워진다', async () => {
    const carol = await signInAsNewGuest();
    const record = newRecordRow('캐럴 체형');
    await carol.client.from('records').insert(record);
    const id = crypto.randomUUID();
    const path = `${carol.userId}/${id}.webp`;
    await carol.client.storage
      .from('photos')
      .upload(path, webp(), { contentType: 'image/webp' });
    await carol.client.from('photos').insert({
      id,
      record_id: record.id,
      kind: 'front',
      path,
      thumb_path: `${carol.userId}/${id}-thumb.webp`,
      width: 10,
      height: 10,
    });

    const admin = createAdminClient();
    await admin.storage.from('photos').remove([path]);
    const { error } = await admin.auth.admin.deleteUser(carol.userId);
    expect(error).toBeNull();
    expect(
      (await admin.from('photos').select('id').eq('user_id', carol.userId))
        .data,
    ).toEqual([]);
  });
});

// 37b 주인 없는 파일 정리: 사진 표에 줄이 없는 파일만 고른다 (지우기는 Edge Function이 Storage API로)
describe.skipIf(!hasTestSupabase)('주인 없는 사진 파일 고르기', () => {
  let dave: TestGuest;
  const record = newRecordRow('데이브 체형');

  beforeAll(async () => {
    dave = await signInAsNewGuest();
    await dave.client.from('records').insert(record);
  });

  afterAll(() => deleteGuests(dave));

  async function orphans(): Promise<string[]> {
    const { data, error } = await createAdminClient().rpc(
      'list_orphan_photo_files',
      // 테스트는 방금 올린 파일을 보려고 나이 조건을 0초로
      { p_min_age: '0 seconds', p_limit: 1000 },
    );
    if (error) throw error;
    return data;
  }

  it('줄이 없는 파일은 고르고, 줄이 있는 파일(보기용·썸네일)은 고르지 않는다', async () => {
    const id = crypto.randomUUID();
    const kept = `${dave.userId}/${id}.webp`;
    const keptThumb = `${dave.userId}/${id}-thumb.webp`;
    const orphan = `${dave.userId}/${crypto.randomUUID()}.webp`;
    for (const path of [kept, keptThumb, orphan]) {
      await dave.client.storage
        .from('photos')
        .upload(path, webp(), { contentType: 'image/webp' });
    }
    await dave.client.from('photos').insert({
      id,
      record_id: record.id,
      kind: 'side',
      path: kept,
      thumb_path: keptThumb,
      width: 10,
      height: 10,
    });

    const found = await orphans();
    expect(found).toContain(orphan);
    expect(found).not.toContain(kept);
    expect(found).not.toContain(keptThumb);
  });

  it('갓 올린 파일(기본 1시간 안)은 고르지 않는다 (올리는 중인 사진)', async () => {
    const fresh = `${dave.userId}/${crypto.randomUUID()}.webp`;
    await dave.client.storage
      .from('photos')
      .upload(fresh, webp(), { contentType: 'image/webp' });
    const { data } = await createAdminClient().rpc('list_orphan_photo_files');
    expect(data ?? []).not.toContain(fresh);
  });

  it('사용자는 부를 수 없다 (모든 사람의 파일을 본다)', async () => {
    const { error } = await dave.client.rpc('list_orphan_photo_files');
    expect(error).not.toBeNull();
  });
});
