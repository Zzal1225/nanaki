// 나키 질문 묶음을 실제 AI로 돌린다 (`npm run naki:eval`, 로컬 전용).
// .env.local의 GOOGLE_GENERATIVE_AI_API_KEY(와 NAKI_MODEL)를 읽어 vitest에 넘긴다: vitest는 .env.local을 읽지 않는다.
// CI에서는 이 스크립트를 부르지 않아 질문 묶음 테스트가 건너뛰어진다 (NAKI_EVAL이 없다)
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readEnvLocal() {
  const values = {};
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    // "이름 = 값"처럼 = 앞뒤에 공백이 있어도 읽는다 (.env.local에 그런 줄이 있다)
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const local = readEnvLocal();
if (!local.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error('.env.local에 GOOGLE_GENERATIVE_AI_API_KEY가 없습니다.');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  // --silent=false: 통과해도 질문별 결과 줄을 보여 준다 (vitest 기본은 통과한 테스트의 console 출력을 숨긴다)
  ['vitest', 'run', 'src/features/naki/nakiEval.test.ts', '--silent=false'],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NAKI_EVAL: '1',
      GOOGLE_GENERATIVE_AI_API_KEY: local.GOOGLE_GENERATIVE_AI_API_KEY,
      ...(local.NAKI_MODEL ? { NAKI_MODEL: local.NAKI_MODEL } : {}),
    },
  },
);
process.exit(result.status ?? 1);
