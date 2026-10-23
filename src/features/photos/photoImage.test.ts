import { describe, expect, it } from 'vitest';
import { checkPhotoFile, fitWithin } from './photoImage';

describe('올릴 수 있는 사진인지', () => {
  it('JPG·PNG·WebP는 받는다', () => {
    expect(checkPhotoFile({ type: 'image/jpeg', name: 'a.jpg' })).toBe('ok');
    expect(checkPhotoFile({ type: 'image/png', name: 'a.png' })).toBe('ok');
    expect(checkPhotoFile({ type: 'image/webp', name: 'a.webp' })).toBe('ok');
  });

  it('HEIC는 따로 안내한다 (type이 비어도 확장자로)', () => {
    expect(checkPhotoFile({ type: 'image/heic', name: 'IMG_1.HEIC' })).toBe(
      'heic',
    );
    expect(checkPhotoFile({ type: '', name: 'IMG_1.heic' })).toBe('heic');
  });

  it('20MB를 넘으면 받지 않는다', () => {
    const MB = 1024 * 1024;
    expect(
      checkPhotoFile({ type: 'image/jpeg', name: 'a.jpg', size: 20 * MB }),
    ).toBe('ok');
    expect(
      checkPhotoFile({ type: 'image/jpeg', name: 'a.jpg', size: 20 * MB + 1 }),
    ).toBe('tooLarge');
  });

  it('그 밖의 형식은 받지 않는다', () => {
    expect(checkPhotoFile({ type: 'image/gif', name: 'a.gif' })).toBe(
      'unsupported',
    );
    expect(checkPhotoFile({ type: 'application/pdf', name: 'a.pdf' })).toBe(
      'unsupported',
    );
  });
});

describe('크기 줄이기', () => {
  it('비율을 지키며 긴 변을 맞춘다 (세로 사진도)', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('작은 사진은 키우지 않는다', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
