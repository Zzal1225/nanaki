import { describe, expect, it } from 'vitest';
import { PhotoInputError } from '../api/photoStore';
import { newRecordPhotoNotice, photoErrorMessage } from './photoError';

describe('photoErrorMessage', () => {
  it('형식·로그인 실패는 그 문구를, 나머지는 다시 시도 안내를', () => {
    expect(photoErrorMessage(new PhotoInputError('HEIC 안내'))).toBe(
      'HEIC 안내',
    );
    expect(photoErrorMessage(new Error('fetch failed'))).toBe(
      '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요',
    );
  });
});

describe('newRecordPhotoNotice (쓰기 화면 저장 뒤 알림)', () => {
  it('다 올렸으면 알리지 않는다', () => {
    expect(newRecordPhotoNotice({ status: 'done' })).toBeNull();
  });

  it('기록이 서버에 못 갔으면 상세에서 붙이라고 안내 (실패 색 아님: 기록은 저장됐다)', () => {
    expect(newRecordPhotoNotice({ status: 'notOnServer' })).toEqual({
      message: '기록은 저장했어요. 사진은 연결되면 상세에서 붙여 주세요',
    });
  });

  it('못 올린 칸 이름을 알려 준다', () => {
    expect(
      newRecordPhotoNotice({
        status: 'partial',
        failedKinds: ['front', 'side'],
      }),
    ).toEqual({
      message:
        '기록은 저장했지만 정면·측면 사진을 올리지 못했어요. 상세에서 다시 붙여 주세요',
      tone: 'error',
    });
  });
});
