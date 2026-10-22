import { describe, expect, it } from 'vitest';
import { splitTagDraft } from './tagDraft';

describe('태그 입력 나누기', () => {
  it('공백이 없으면 아직 치는 중', () => {
    expect(splitTagDraft('출근', [], 5)).toEqual({ tags: [], draft: '출근' });
  });

  it('공백을 치면 그 앞까지가 태그가 된다', () => {
    expect(splitTagDraft('출근길 ', [], 5)).toEqual({
      tags: ['출근길'],
      draft: '',
    });
  });

  it('붙여 넣은 여러 단어는 마지막만 남기고 태그로 (연속 공백·중복은 무시)', () => {
    expect(splitTagDraft('출근길  단골 출근길 카페', ['아침'], 5)).toEqual({
      tags: ['아침', '출근길', '단골'],
      draft: '카페',
    });
  });

  it('개수가 차면 더 넣지 않는다', () => {
    expect(splitTagDraft('a b c ', ['x'], 2)).toEqual({
      tags: ['x', 'a'],
      draft: '',
    });
  });
});
