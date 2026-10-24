// 기록 1만 건에서 주요 화면을 재는 스크립트 (step4 41, `npm run perf:scale`). 바꾸기 전 수치부터 잰다 (CLAUDE.md 5-2).
// 실행 중인 앱(테스트용 로컬 Supabase에 붙은 빌드)이 PERF_BASE_URL에 떠 있어야 한다. CI는 scale-perf 워크플로가 돌린다.
//
// 재는 것 (결과는 perf-scale/summary.json + CI 실행 요약 표). 조건·방문 나누기는 calendar-perf.mts와 같다:
// 처음 방문 = HTTP 캐시·서비스 워커·IndexedDB를 비움(쿠키는 남김) / 다시 방문 = 그대로
// 1. 처음 방문: 홈 첫 표시 + 전체 동기화(1만 건을 기기 사본에 받기)가 끝날 때까지와 그 응답 크기
// 2. 다시 방문(사본에 1만 건): 홈, 기록 탭, 가계부 상세, 검색(주소로 열기·결과 없는 검색어·결과 있는 검색어),
//    보고서 "올해", 설정(데이터 개수)
// 화면마다 "다 그린 때"와 그동안의 긴 작업(50ms 넘게 메인 스레드를 막은 시간의 합)을 남긴다.
// 긴 작업을 따로 보는 이유: 1만 건을 한 번에 읽고 검사하면 화면은 결국 그려져도 그동안 누르기·스크롤이 멈춘다 (INP가 나빠진다)
//
// 앱 코드를 import하지 않는다 (번들 없이 Node가 바로 돌려서 경로 별칭 @/를 못 읽는다). 기록 모양은 앱 스키마를 통과하게 직접 만든다
import { chromium, type CDPSession, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const FULL_RECORD_COUNT = 10_000;
// 3년 동안 하루 9개 꼴. 매일 가계부 몇 건 + 운동·후기·체형을 꾸준히 남긴 사람이 쌓는 양
const FULL_SPAN_DAYS = 3 * 365;
// 비교군: PERF_RECORD_COUNT=300이면 같은 밀도(하루 9개)로 최근 33일만 넣는다. 이 달 화면은 1만 건과 똑같이 그리고
// 전체 개수만 달라서, 두 결과의 차이 = "전체가 많아서 드는 비용"이다. 첫 측정에서 모든 화면이 3.3초였는데
// 기록 수 때문인지 앱 시작 비용인지 가를 기준이 없었다 (2026-10-24)
const RECORD_COUNT = Number(process.env.PERF_RECORD_COUNT ?? FULL_RECORD_COUNT);
const SPAN_DAYS = Math.max(
  1,
  Math.round((RECORD_COUNT * FULL_SPAN_DAYS) / FULL_RECORD_COUNT),
);
const OUT_DIR = `perf-scale/${RECORD_COUNT}`;
// 한 번에 넣는 줄 수. 한 요청이 너무 크면 PostgREST 본문 한도에 걸린다
const INSERT_BATCH = 1000;
// 앱의 동기화 한 쪽 크기 (src/lib/db/sync.ts SYNC_PAGE_SIZE). 이보다 적게 오면 마지막 쪽이다
const SYNC_PAGE_SIZE = 1000;
const RUNS = 5;
const WAIT_TIMEOUT_MS = 120_000;
const TIME_ZONE = 'Asia/Seoul';
// 결과가 하나도 없는 검색어: 1만 건을 끝까지 다 훑어야 해서 검색의 가장 나쁜 경우다
const NO_MATCH_KEYWORD = '없는검색어';
// 결과가 많은 검색어 (가계부 제목 중 하나). 300개 한도를 넘는다
const MANY_MATCH_KEYWORD = '점심';
const SOME_MATCH_KEYWORD = '택시';

// calendar-perf.mts와 같은 값 (Lighthouse mobileSlow4G를 크롬 스로틀링으로)
const MOBILE_SLOW_4G = {
  latencyMs: 562.5,
  downloadKbps: 1474.56,
  uploadKbps: 675,
  cpuSlowdown: 4,
};
const KBPS_TO_BYTES_PER_SECOND = 1024 / 8;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다`);
  return value;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// toISOString()은 UTC라 한국 오전 9시 전에는 하루 전 날짜가 나온다
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date());
}

function addDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

const EXPENSES = [
  { title: '점심', category: '식비', amount: 9000 },
  { title: '커피', category: '카페', amount: 4500 },
  { title: '택시', category: '교통', amount: 12000 },
  { title: '장보기', category: '생활', amount: 38000 },
  { title: '옷', category: '쇼핑', amount: 59000 },
];
const ACTIVITIES = ['러닝', '헬스', '요가', '수영'];
const TARGET_KINDS = ['장소', '제품', '콘텐츠', '경험'];

// 타입 비율: 가계부 60% · 운동 20% · 후기 12% · 체형 8%. 루틴 체크는 뺐다(루틴 규칙이 따로 있어야 뜻이 있다).
// 날짜는 오늘부터 3년 전까지 고르게: 달마다 약 270개라 홈·가계부 상세는 "한 달 300개"(calendar-perf)와 비슷하고,
// 1만 건 전체를 읽는 곳(검색·보고서 올해·설정 개수·동기화)에서 차이가 드러난다
function buildRows(today: string) {
  return Array.from({ length: RECORD_COUNT }, (_, index) => {
    const occurredAt = addDays(
      today,
      -Math.floor((index * SPAN_DAYS) / RECORD_COUNT),
    );
    const base = {
      occurred_at: occurredAt,
      tags: index % 7 === 0 ? ['주말'] : [],
      // 검색은 메모도 본다. 일부에만 넣어 실제처럼 섞는다
      memo: index % 5 === 0 ? `메모 ${index}` : null,
    };
    const slot = index % 25;
    if (slot < 15) {
      const expense = EXPENSES[index % EXPENSES.length];
      return {
        ...base,
        type: 'expense',
        title: expense.title,
        fields: {
          amount: expense.amount + (index % 10) * 100,
          category: expense.category,
          paymentMethod: '카드',
        },
      };
    }
    if (slot < 20) {
      return {
        ...base,
        type: 'workout',
        title: ACTIVITIES[index % ACTIVITIES.length],
        fields: {
          activity: ACTIVITIES[index % ACTIVITIES.length],
          minutes: 30 + (index % 4) * 10,
        },
      };
    }
    if (slot < 23) {
      return {
        ...base,
        type: 'review',
        title: `동네 가게 ${index}`,
        fields: {
          rating: (index % 5) + 1,
          targetKind: TARGET_KINDS[index % TARGET_KINDS.length],
        },
      };
    }
    return {
      ...base,
      type: 'body',
      title: '체중',
      fields: { weight: 65 + (index % 50) / 10 },
    };
  });
}

type CookieToSet = { name: string; value: string };

// 측정용 체험 계정에 1만 건을 계정 권한으로 넣는다 (RLS를 그대로 거친다, calendar-perf.mts의 createSeededGuest와 같은 이유)
async function createSeededGuest(today: string): Promise<CookieToSet[]> {
  const cookies = new Map<string, string>();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) cookies.set(name, value);
      },
    },
  });
  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;

  const rows = buildRows(today);
  for (let start = 0; start < rows.length; start += INSERT_BATCH) {
    const { error } = await supabase
      .from('records')
      .insert(rows.slice(start, start + INSERT_BATCH));
    if (error) throw error;
  }
  const result = [...cookies]
    .filter(([, value]) => value !== '')
    .map(([name, value]) => ({ name, value }));
  if (result.length === 0)
    throw new Error('로그인 쿠키가 만들어지지 않았습니다');
  return result;
}

async function throttle(cdp: CDPSession) {
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: MOBILE_SLOW_4G.cpuSlowdown,
  });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: MOBILE_SLOW_4G.latencyMs,
    downloadThroughput: MOBILE_SLOW_4G.downloadKbps * KBPS_TO_BYTES_PER_SECOND,
    uploadThroughput: MOBILE_SLOW_4G.uploadKbps * KBPS_TO_BYTES_PER_SECOND,
  });
}

async function resetToFirstVisit(cdp: CDPSession) {
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Storage.clearDataForOrigin', {
    origin: BASE_URL,
    storageTypes: 'service_workers,cache_storage,indexeddb',
  });
}

// 페이지가 열릴 때마다 긴 작업을 모은다. 재기 직전에 비우고(resetLongTasks), 다 그린 뒤 합을 읽는다
const LONG_TASK_OBSERVER = `
  window.__longTaskMs = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__longTaskMs += entry.duration;
  }).observe({ type: 'longtask', buffered: true });
`;

async function readLongTasks(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __longTaskMs: number }).__longTaskMs,
  );
}

async function resetLongTasks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __longTaskMs: number }).__longTaskMs = 0;
  });
}

// 화면이 "다 그려졌다"의 공통 조건: 불러오는 중 표시(aria-busy=true)가 하나도 없고, 그 화면의 끝 신호가 있다.
// requestAnimationFrame마다 확인해 그려진 프레임 기준에 가깝게 잡는다. 돌려주는 값은 performance.now()
// readyText가 있으면 그 글자를 담은 요소여야 한다 (설정의 "기록 10000개"처럼 자리가 먼저 그려지고 글자가 나중에 채워지는 곳)
async function waitForScreen(
  page: Page,
  readySelector: string,
  readyText?: string,
) {
  const handle = await page.waitForFunction(
    ([selector, text]) => {
      if (document.querySelector('main [aria-busy="true"]')) return null;
      // 보이는 요소만 (숨은 PC 왼쪽 목록이 먼저 그려져 "끝"으로 잡히지 않게, measureSearchSubmit 설명)
      const found = [...document.querySelectorAll(selector)].some(
        (element) =>
          element.checkVisibility() &&
          (!text || element.textContent?.includes(text)),
      );
      return found ? performance.now() : null;
    },
    [readySelector, readyText] as const,
    { polling: 'raf', timeout: WAIT_TIMEOUT_MS },
  );
  return (await handle.jsonValue()) as number;
}

type Measure = { ms: number; longTaskMs: number };

// 주소를 열고 다 그릴 때까지. 시작 = 페이지 이동 시작(performance.now()의 0)
async function measureOpen(
  page: Page,
  path: string,
  readySelector: string,
  readyText?: string,
): Promise<Measure> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'commit' });
  const ms = await waitForScreen(page, readySelector, readyText);
  return { ms, longTaskMs: await readLongTasks(page) };
}

// 검색창에 쓰고 Enter를 누른 때부터 결과가 바뀔 때까지. 누르기와 시작 시각을 페이지 안에서 한 번에 한다
// expectEmpty: 결과 개수(status)가 "0개"가 되기를 / 아니면 0개가 아니기를 기다린다
async function measureSearchSubmit(
  page: Page,
  keyword: string,
  expectEmpty: boolean,
): Promise<Measure> {
  await page.getByRole('searchbox', { name: '검색어' }).fill(keyword);
  await resetLongTasks(page);
  // 보이는 것만 고른다: 모바일에서도 기록 layout이 PC용 왼쪽 목록(RecordsSidePanel)을 CSS로 숨긴 채 그려서
  // 검색 폼·결과 개수가 두 벌 있다. 첫 번째를 고르면 숨은 폼(이전 검색어)을 제출해 결과가 바뀌지 않았다 (2026-10-24 첫 실행)
  const startedAt = await page.evaluate(() => {
    const form = [
      ...document.querySelectorAll<HTMLFormElement>('form[role="search"]'),
    ].find((element) => element.checkVisibility());
    if (!form) throw new Error('검색 폼 없음');
    const now = performance.now();
    form.requestSubmit();
    return now;
  });
  const handle = await page.waitForFunction(
    ([word, isEmptyExpected]) => {
      if (document.querySelector('main [aria-busy="true"]')) return null;
      // 검색어가 주소에 반영되기 전의 이전 결과를 "끝"으로 보지 않게 주소부터 확인한다
      if (new URLSearchParams(location.search).get('q') !== word) return null;
      const status = [
        ...document.querySelectorAll('main [role="status"]'),
      ].find((element) => element.checkVisibility());
      if (!status) return null;
      return (status.textContent === '0개') === isEmptyExpected
        ? performance.now()
        : null;
    },
    [keyword, expectEmpty] as const,
    { polling: 'raf', timeout: WAIT_TIMEOUT_MS },
  );
  const ms = ((await handle.jsonValue()) as number) - startedAt;
  return { ms, longTaskMs: await readLongTasks(page) };
}

type FirstVisitRun = {
  homeMs: number;
  syncDoneMs: number;
  syncBytes: number;
  syncPages: number;
  longTaskMs: number;
};

// 처음 방문: 홈 첫 표시, 그리고 뒤에서 도는 전체 동기화가 마지막 쪽(1000개 미만)을 받을 때까지
async function measureFirstVisit(
  page: Page,
  cdp: CDPSession,
  today: string,
): Promise<FirstVisitRun> {
  await resetToFirstVisit(cdp);
  let syncBytes = 0;
  let syncPages = 0;
  let resolveDone: (at: number) => void = () => {};
  const syncDone = new Promise<number>((resolve) => {
    resolveDone = resolve;
  });
  const onResponse = async (response: import('@playwright/test').Response) => {
    const url = response.url();
    if (
      !url.includes('/rest/v1/records') ||
      !url.includes(`limit=${SYNC_PAGE_SIZE}`)
    )
      return;
    const body = await response.body().catch(() => Buffer.alloc(0));
    syncBytes += body.length;
    syncPages += 1;
    const rows = JSON.parse(body.toString() || '[]') as unknown[];
    if (rows.length < SYNC_PAGE_SIZE) {
      resolveDone(await page.evaluate(() => performance.now()));
    }
  };
  page.on('response', onResponse);
  try {
    const home = await measureOpen(
      page,
      `/?date=${today}`,
      '[role="grid"][aria-busy="false"]',
    );
    const syncDoneMs = await syncDone;
    return {
      homeMs: home.ms,
      syncDoneMs,
      syncBytes,
      syncPages,
      longTaskMs: await readLongTasks(page),
    };
  } finally {
    page.off('response', onResponse);
  }
}

const RETURN_SCREENS = (today: string) => {
  const year = today.slice(0, 'YYYY'.length);
  return [
    {
      key: 'home',
      label: '홈 (이 달)',
      path: `/?date=${today}`,
      ready: '[role="grid"][aria-busy="false"]',
    },
    {
      key: 'records',
      label: '기록 탭 (이번 달 카드·최근 기록)',
      path: '/records',
      ready: 'section[aria-label="이번 달 요약"] ~ ul li',
    },
    {
      key: 'expense',
      label: '가계부 상세 (이 달 목록)',
      path: '/records/type/expense',
      ready: 'main ul li',
    },
    {
      key: 'searchUrl',
      label: `검색 주소로 열기 ("${MANY_MATCH_KEYWORD}", 300개 한도)`,
      path: `/records/search?q=${encodeURIComponent(MANY_MATCH_KEYWORD)}`,
      ready: 'main [role="status"]',
    },
    {
      key: 'report',
      label: '보고서 올해 (4개 타입)',
      path: `/report?from=${year}-01-01&to=${year}-12-31&types=expense%2Creview%2Cworkout%2Cbody`,
      ready: 'section[aria-label="가계부"]',
    },
    {
      key: 'settings',
      label: '설정 (데이터 개수)',
      path: '/settings',
      ready: 'main p',
      text: `기록 ${RECORD_COUNT}개`,
    },
  ] as const;
};

type ScreenKey =
  | ReturnType<typeof RETURN_SCREENS>[number]['key']
  | 'searchNoMatch'
  | 'searchSomeMatch';

async function measureReturnVisits(page: Page, today: string) {
  const screens = RETURN_SCREENS(today);
  const results: Record<string, Measure[]> = {};
  for (let run = 1; run <= RUNS; run += 1) {
    for (const screen of screens) {
      const measure = await measureOpen(
        page,
        screen.path,
        screen.ready,
        'text' in screen ? screen.text : undefined,
      );
      (results[screen.key] ??= []).push(measure);
      if (screen.key === 'searchUrl') {
        (results.searchNoMatch ??= []).push(
          await measureSearchSubmit(page, NO_MATCH_KEYWORD, true),
        );
        (results.searchSomeMatch ??= []).push(
          await measureSearchSubmit(page, SOME_MATCH_KEYWORD, false),
        );
      }
    }
    console.log(
      `다시 방문 #${run}: ` +
        Object.entries(results)
          .map(
            ([key, list]) => `${key} ${Math.round(list[list.length - 1].ms)}ms`,
          )
          .join(', '),
    );
  }
  return results as Record<ScreenKey, Measure[]>;
}

function row(label: string, list: Measure[]): string {
  const values = list.map((m) => m.ms);
  return `| ${label} | ${values.map((v) => Math.round(v)).join(' / ')} | **${Math.round(median(values))}ms** | ${Math.round(median(list.map((m) => m.longTaskMs)))}ms |`;
}

function toMarkdown(
  today: string,
  first: FirstVisitRun[],
  returns: Record<ScreenKey, Measure[]>,
): string {
  const labels: Record<ScreenKey, string> = {
    ...Object.fromEntries(RETURN_SCREENS(today).map((s) => [s.key, s.label])),
    searchNoMatch: `검색 Enter → 결과 없음 ("${NO_MATCH_KEYWORD}", 1만 건 전부 훑기)`,
    searchSomeMatch: `검색 Enter → 결과 있음 ("${SOME_MATCH_KEYWORD}")`,
  } as Record<ScreenKey, string>;
  const order: ScreenKey[] = [
    'home',
    'records',
    'expense',
    'searchUrl',
    'searchNoMatch',
    'searchSomeMatch',
    'report',
    'settings',
  ];
  const kib = (bytes: number) => `${Math.round(bytes / 1024)}KiB`;
  return [
    `## 기록 ${RECORD_COUNT.toLocaleString('en-US')}건 (최근 ${SPAN_DAYS}일) 성능`,
    '',
    `Playwright, 모바일 화면, 크롬 스로틀링(CPU ${MOBILE_SLOW_4G.cpuSlowdown}배, 지연 ${MOBILE_SLOW_4G.latencyMs}ms, 내려받기 ${MOBILE_SLOW_4G.downloadKbps}Kbps), ${RUNS}회. 긴 작업 = 50ms 넘는 메인 스레드 작업 시간의 합(가운데 값)`,
    '',
    '### 처음 방문 (캐시·서비스 워커·기기 사본 비움)',
    '',
    '| 항목 | 각 실행 | 가운데 값 |',
    '| --- | --- | --- |',
    `| 홈 첫 표시 | ${first.map((r) => Math.round(r.homeMs)).join(' / ')} | **${Math.round(median(first.map((r) => r.homeMs)))}ms** |`,
    `| 전체 동기화 끝 (페이지 이동부터) | ${first.map((r) => Math.round(r.syncDoneMs)).join(' / ')} | **${Math.round(median(first.map((r) => r.syncDoneMs)))}ms** |`,
    `| 동기화 응답 (${median(first.map((r) => r.syncPages))}쪽, 압축 전 본문) | | **${kib(median(first.map((r) => r.syncBytes)))}** |`,
    `| 긴 작업 합 (동기화 끝까지) | ${first.map((r) => Math.round(r.longTaskMs)).join(' / ')} | **${Math.round(median(first.map((r) => r.longTaskMs)))}ms** |`,
    '',
    '### 다시 방문 (기기 사본에 1만 건)',
    '',
    '| 화면 | 각 실행 | 가운데 값 | 긴 작업 |',
    '| --- | --- | --- | --- |',
    ...order.map((key) => row(labels[key], returns[key])),
    '',
  ].join('\n');
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const today = todayIn(TIME_ZONE);
  const seedStartedAt = Date.now();
  const cookies = await createSeededGuest(today);
  console.log(`기록 ${RECORD_COUNT}건 넣기: ${Date.now() - seedStartedAt}ms`);

  const profileDir = join(tmpdir(), `nanaki-scale-perf-${Date.now()}`);
  const context = await chromium.launchPersistentContext(profileDir, {
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    timezoneId: TIME_ZONE,
  });
  try {
    await context.addCookies(
      cookies.map((cookie) => ({ ...cookie, url: BASE_URL })),
    );
    await context.addInitScript(LONG_TASK_OBSERVER);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await throttle(cdp);

    const first: FirstVisitRun[] = [];
    for (let run = 1; run <= RUNS; run += 1) {
      const result = await measureFirstVisit(page, cdp, today);
      first.push(result);
      console.log(
        `처음 방문 #${run}: 홈 ${Math.round(result.homeMs)}ms, 동기화 끝 ${Math.round(result.syncDoneMs)}ms (${result.syncPages}쪽 ${Math.round(result.syncBytes / 1024)}KiB), 긴 작업 ${Math.round(result.longTaskMs)}ms`,
      );
    }
    // 마지막 처음 방문이 사본을 다 채웠다 → 그대로 다시 방문을 잰다
    const returns = await measureReturnVisits(page, today);

    await writeFile(
      join(OUT_DIR, 'summary.json'),
      JSON.stringify(
        {
          recordCount: RECORD_COUNT,
          throttling: MOBILE_SLOW_4G,
          first,
          returns,
        },
        null,
        2,
      ),
    );
    const markdown = toMarkdown(today, first, returns);
    console.log(markdown);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
    }
  } finally {
    await context.close();
    await rm(profileDir, { recursive: true, force: true });
  }
}

await main();
