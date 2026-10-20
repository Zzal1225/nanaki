import { describe, expect, it } from 'vitest';
import { parseSupabaseEnv } from './env';

const URL_OK = 'https://abcdefghijklmnopqrst.supabase.co';
const KEY_OK = 'sb_publishable_example';

describe('parseSupabaseEnv', () => {
  it('올바른 주소와 키는 그대로 돌려준다', () => {
    expect(parseSupabaseEnv(URL_OK, KEY_OK)).toEqual({
      url: URL_OK,
      publishableKey: KEY_OK,
    });
  });

  it('앞뒤 공백과 주소 끝의 /는 지운다', () => {
    expect(parseSupabaseEnv(` ${URL_OK}/ `, ` ${KEY_OK} `)).toEqual({
      url: URL_OK,
      publishableKey: KEY_OK,
    });
  });

  it('값이 없거나 공백뿐이면 오류를 낸다', () => {
    expect(() => parseSupabaseEnv(undefined, KEY_OK)).toThrow('없습니다');
    expect(() => parseSupabaseEnv(URL_OK, '   ')).toThrow('없습니다');
  });

  it('주소 뒤에 /rest/v1/ 같은 경로가 붙으면 오류를 낸다', () => {
    expect(() => parseSupabaseEnv(`${URL_OK}/rest/v1/`, KEY_OK)).toThrow(
      '/rest/v1/',
    );
  });

  it('주소 모양이 아니면 오류를 낸다', () => {
    expect(() => parseSupabaseEnv('abcdefg.supabase.co', KEY_OK)).toThrow(
      '주소 모양이 아닙니다',
    );
  });

  it('secret 키가 들어 있으면 오류를 낸다', () => {
    expect(() => parseSupabaseEnv(URL_OK, 'sb_secret_example')).toThrow(
      'secret 키',
    );
  });
});
