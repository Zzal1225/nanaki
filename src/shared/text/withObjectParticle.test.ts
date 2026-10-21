import { describe, expect, it } from 'vitest';
import { withObjectParticle } from './withObjectParticle';

describe('withObjectParticle', () => {
  it('받침이 있으면 을', () => {
    expect(withObjectParticle('금액')).toBe('금액을');
    expect(withObjectParticle('별점')).toBe('별점을');
  });
  it('받침이 없으면 를', () => {
    expect(withObjectParticle('분류')).toBe('분류를');
    expect(withObjectParticle('장소')).toBe('장소를');
  });
  it('한글이 아니면 을(를)', () => {
    expect(withObjectParticle('PIN')).toBe('PIN을(를)');
  });
});
