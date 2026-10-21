// 로그인 뒤 화면까지 Lighthouse로 재는 스크립트 (CI integration 작업, `npm run lighthouse`).
// 실행 중인 앱(테스트용 로컬 Supabase에 붙은 빌드)이 BASE_URL에 떠 있어야 한다.
//
// 흐름: Playwright로 크롬을 띄움(디버깅 포트 열기) → 로그인 화면 측정 → "체험하기"로 로그인 → 홈·기록 탭 측정.
// Lighthouse는 같은 크롬에 붙어 재므로 로그인 쿠키를 함께 쓴다. 결과는 LHCI가 읽는 .lighthouseci/lhr-*.json으로 저장하고
// `lhci assert`(lighthouserc.json 기준)가 통과·실패를 정한다
//
// Node 24는 TypeScript 타입을 지우고 바로 실행한다 (`node scripts/lighthouse.mts`). .mts = ESM으로 읽으라는 표시(최상위 await).
// 앱 번들을 거치지 않으므로 경로 별칭(@/)을 쓰지 않는다
import { chromium, type BrowserContext } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:3000';
const DEBUG_PORT = 9222;
// 한 번만 재면 CI 서버 상태에 따라 점수가 몇 점씩 흔들린다. 3번 재고 가운데 값(median-run)으로 판단한다
const RUNS_PER_PAGE = 3;
const LHCI_DIR = '.lighthouseci';
const HTML_DIR = 'lighthouse-report';

type Measurement = { name: string; path: string };

const SIGNED_OUT_PAGES: Measurement[] = [{ name: 'login', path: '/login' }];
const SIGNED_IN_PAGES: Measurement[] = [
  { name: 'home', path: '/' },
  { name: 'records', path: '/records' },
];

let reportIndex = 0;

async function measure(page: Measurement) {
  for (let run = 1; run <= RUNS_PER_PAGE; run += 1) {
    const result = await lighthouse(`${BASE_URL}${page.path}`, {
      port: DEBUG_PORT,
      output: ['json', 'html'],
      logLevel: 'error',
      // 기본값은 재기 전에 쿠키·저장소를 지운다. 그러면 로그인이 풀린 화면(로그인 화면으로 이동)을 재게 된다
      disableStorageReset: true,
    });
    if (!result) throw new Error(`Lighthouse 결과 없음: ${page.path}`);

    const [json, html] = result.report as string[];
    // LHCI는 lhr-<숫자>.json 이름만 읽는다 (@lhci/utils saved-reports)
    reportIndex += 1;
    await writeFile(
      join(LHCI_DIR, `lhr-${Date.now()}${reportIndex}.json`),
      json,
    );
    await writeFile(join(HTML_DIR, `${page.name}-${run}.html`), html);

    const { performance, accessibility } = result.lhr.categories;
    console.log(
      `${page.name} #${run}: 성능 ${Math.round((performance.score ?? 0) * 100)}, 접근성 ${Math.round((accessibility.score ?? 0) * 100)}`,
    );
  }
}

async function signInAsGuest(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('button', { name: '로그인 없이 체험하기' }).click();
  await page.waitForURL(`${BASE_URL}/`);
  await page.close();
}

async function main() {
  await rm(LHCI_DIR, { recursive: true, force: true });
  await rm(HTML_DIR, { recursive: true, force: true });
  await mkdir(LHCI_DIR, { recursive: true });
  await mkdir(HTML_DIR, { recursive: true });

  // 영구 프로필로 띄워야 Lighthouse가 디버깅 포트로 연 새 탭이 같은 쿠키(로그인)를 본다.
  // 일반 newContext()는 따로 떨어진 시크릿 창 같아서 Lighthouse 탭에서 로그인이 보이지 않는다
  const profileDir = join(tmpdir(), `nanaki-lighthouse-${Date.now()}`);
  const context = await chromium.launchPersistentContext(profileDir, {
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });

  try {
    for (const page of SIGNED_OUT_PAGES) await measure(page);
    await signInAsGuest(context);
    for (const page of SIGNED_IN_PAGES) await measure(page);
  } finally {
    await context.close();
    await rm(profileDir, { recursive: true, force: true });
  }
}

await main();
