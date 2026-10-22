// 기록이 많은 달(한 달 300개)에서 홈 캘린더를 재는 스크립트 (CI integration 작업, `npm run perf:calendar`).
// 실행 중인 앱(테스트용 로컬 Supabase에 붙은 빌드)이 PERF_BASE_URL에 떠 있어야 한다.
//
// 재는 것 (결과는 perf-report/summary.json + CI 실행 요약 표):
// 1. 홈 첫 표시: 주소 이동 → 캘린더가 이 달 기록을 그릴 때까지 (5회, 가운데 값)
// 2. 달 넘김: "다음 달" 버튼 → 처음 가는 달의 기록이 그려질 때까지 (네트워크 요청 포함)
//    / "이전 달" 버튼 → 다시 온 달이 그려질 때까지 (TanStack Query 캐시, 요청 없음)
// 3. Lighthouse 홈 (lighthouse.mts와 같은 조건: 모바일, 3회 가운데 값) → FCP·LCP·LCP 요소·JS 전송량
//
// 두 가지 방문으로 나눠 잰다 (26단계, 25 오프라인 이후):
// - 처음 방문: 매 실행 전 HTTP 캐시 + 서비스 워커·그 캐시 + IndexedDB(기기 사본)를 지운다 (쿠키=로그인은 남김).
//   20b 기준 수치와 같은 조건이라 전후를 비교할 수 있다
// - 다시 방문: 서비스 워커와 기기 사본을 그대로 둔다 (평소 쓰는 모습). 25에서 새로 생긴 경우
// 처음 재측정에서는 HTTP 캐시만 비워서 2회째부터 "다시 방문"이 섞였다(가운데 값 933ms, Lighthouse 전송량 0KiB)
//
// Lighthouse 점수만으로는 부족해서 1·2를 따로 잰다: Lighthouse는 페이지를 한 번 여는 것만 재서 "달 넘김"을 못 재고,
// LCP는 "가장 큰 요소가 그려진 때"라 캘린더 점(작은 요소)이 다 찍힌 때와 같다는 보장이 없다.
// 완료 신호는 캘린더의 aria-busy (CalendarGrid): 이 달 기록을 불러오는 중이면 true, 다 그렸으면 false
//
// lighthouse.mts가 LHCI 기준(lighthouserc.json)을 맡고, 이 스크립트는 수치만 남긴다 (실패 조건 없음).
// 300개 홈을 LHCI에 같이 넣지 않는 이유: 같은 주소(/)의 실행을 한데 묶어 가운데 값을 골라서, 12개짜리 기준 측정과 섞인다
import { chromium, type CDPSession, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import lighthouse from 'lighthouse';
import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
// lighthouse.mts(9222)와 겹치지 않게. 앞 단계의 크롬이 아직 닫히는 중이어도 부딪히지 않는다
const DEBUG_PORT = 9223;
const OUT_DIR = 'perf-report';

// 하루 10개 꼴. 가계부를 매일 쓰는 사람이 한 달에 남기는 양보다 넉넉하게 잡아, 지금 구조가 버티는지 본다
const RECORDS_PER_MONTH = 300;
// Lighthouse보다 한 번이 짧아서 더 많이 잰다. 홀수라야 가운데 값이 하나로 정해진다
const TIMING_RUNS = 5;
const LIGHTHOUSE_RUNS = 3;
const WAIT_TIMEOUT_MS = 60_000;
// 사용자 기기 날짜 기준과 같게 (playwright.config.ts의 timezoneId와 같은 값)
const TIME_ZONE = 'Asia/Seoul';

// Lighthouse 모바일 기본 조건(mobileSlow4G)을 크롬 개발자 도구 스로틀링 값으로 옮긴 것.
// 출처: @paulirish/trace_engine lantern/simulation/Constants.js (Lighthouse가 쓰는 값).
// Lighthouse는 이 조건을 "계산(simulate)"으로 흉내 내지만, 여기서는 크롬이 실제로 느리게 돌게 한다(devtools 방식).
// 그래서 두 수치는 같은 조건을 노렸어도 방식이 달라 서로 직접 비교하지 않는다
const MOBILE_SLOW_4G = {
  // 요청 하나에 붙는 왕복 지연 (150ms × Lighthouse 보정값 3.75)
  latencyMs: 562.5,
  downloadKbps: 1474.56,
  uploadKbps: 675,
  cpuSlowdown: 4,
};
const KBPS_TO_BYTES_PER_SECOND = 1024 / 8;

type Visit = 'first' | 'return';

const VISIT_LABEL: Record<Visit, string> = {
  first: '처음 방문 (캐시·서비스 워커·기기 사본 비움)',
  return: '다시 방문 (서비스 워커·기기 사본 그대로)',
};

// 처음 방문하는 사용자로 만든다: 받아 둔 파일·화면·기록을 모두 지운다. 쿠키(로그인)는 남긴다
async function resetToFirstVisit(cdp: CDPSession) {
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Storage.clearDataForOrigin', {
    origin: BASE_URL,
    storageTypes: 'service_workers,cache_storage,indexeddb',
  });
}

type TimingRun = {
  firstRecordsMs: number;
  recordsRequestMs: number;
  recordsResponseBytes: number;
  nextMonthMs: number;
  backMonthMs: number;
};

type LighthouseRun = {
  performance: number;
  fcpMs: number;
  lcpMs: number;
  tbtMs: number;
  totalBytes: number;
  scriptBytes: number;
  lcpElement: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다`);
  return value;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// 'YYYY-MM-DD' (스웨덴 표기가 ISO와 같은 모양이라 Intl로 시간대만 바꿔 얻는다).
// toISOString()은 UTC라 한국 오전 9시 전에는 하루 전 날짜가 나온다
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date());
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  // Date.UTC의 달은 0부터, 넘치면 해가 넘어간다 (12월 + 1 = 다음 해 1월)
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number);
  // 다음 달의 0일 = 이번 달 말일
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

// 앱의 formatYearMonthLabel과 같은 모양. 버튼 이름("2026년 11월로")과 캘린더 제목을 찾는 데 쓴다.
// 앱 코드를 import하지 않는 이유: 이 스크립트는 번들 없이 Node가 바로 돌려서 경로 별칭(@/)을 못 읽는다
function toMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

// 앱 스키마(가계부·후기)를 통과하는 기록. 통과하지 못하면 앱이 그 줄을 건너뛰어 300개를 그리지 않게 된다.
// 날짜를 1일부터 고루 나눠, 모든 칸에 점이 찍히는(가장 그릴 게 많은) 달을 만든다
function buildMonthRows(month: string) {
  const days = daysInMonth(month);
  return Array.from({ length: RECORDS_PER_MONTH }, (_, index) => {
    const day = String((index % days) + 1).padStart(2, '0');
    const base = {
      occurred_at: `${month}-${day}`,
      memo: null,
      tags: [],
    };
    return index % 2 === 0
      ? {
          ...base,
          type: 'expense',
          title: `점심 ${index + 1}`,
          fields: {
            amount: 5000 + (index % 10) * 1000,
            category: '식비',
            paymentMethod: '카드',
          },
        }
      : {
          ...base,
          type: 'review',
          title: `동네 가게 ${index + 1}`,
          fields: { rating: (index % 5) + 1, targetKind: '장소' },
        };
  });
}

type CookieToSet = { name: string; value: string };

// 체험 계정(익명 로그인)을 하나 만들고, 이번 달·다음 달에 기록을 300개씩 넣은 뒤 그 로그인 쿠키를 돌려준다.
// - 화면에서 "체험하기"를 누르지 않는 이유: 그 계정의 토큰을 꺼내 기록을 넣으려면 쿠키 형식(@supabase/ssr 내부)을 직접 풀어야 한다.
//   반대로 @supabase/ssr로 로그인하면 앱과 같은 형식의 쿠키를 라이브러리가 만들어 준다 → 그대로 브라우저에 넣는다
// - secret 키로 넣지 않는 이유: 계정 권한(anon 키 + 로그인)으로 넣어야 RLS를 그대로 거쳐, 앱이 실제로 보는 데이터와 같다
// - E2E·lighthouse.mts와 다른 계정이라 서로의 데이터에 영향을 주지 않는다
async function createSeededGuest(months: string[]): Promise<CookieToSet[]> {
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

  const rows = months.flatMap(buildMonthRows);
  const { error: insertError } = await supabase.from('records').insert(rows);
  if (insertError) throw insertError;

  // 쿠키는 로그인 이벤트(onAuthStateChange)에서 비동기로 써진다. 넣기 요청을 기다리는 동안 끝나 있어야 정상이다.
  // 지우는 쿠키(빈 값)는 빼고 넘긴다
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

// 캘린더가 이 제목의 달을 기록까지 다 그렸을 때의 performance.now() (페이지 이동 시작 기준 ms).
// requestAnimationFrame마다 확인해서, 화면에 그려진 프레임 기준에 가깝게 잡는다
async function waitForCalendar(page: Page, title: string): Promise<number> {
  const handle = await page.waitForFunction(
    (expectedTitle) => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid || grid.getAttribute('aria-busy') !== 'false') return null;
      const heading = document.getElementById(
        grid.getAttribute('aria-labelledby') ?? '',
      );
      if (heading?.textContent !== expectedTitle) return null;
      return performance.now();
    },
    title,
    { polling: 'raf', timeout: WAIT_TIMEOUT_MS },
  );
  return (await handle.jsonValue()) as number;
}

// 버튼을 누른 때부터 그 달이 다 그려질 때까지. 누르기와 시작 시각을 페이지 안에서 한 번에 해서,
// Node ↔ 브라우저 왕복 시간이 측정값에 섞이지 않게 한다
async function measureMonthSwitch(
  page: Page,
  buttonLabel: string,
  title: string,
): Promise<number> {
  const startedAt = await page.evaluate((label) => {
    const button = document.querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    );
    if (!button) throw new Error(`버튼 없음: ${label}`);
    const now = performance.now();
    button.click();
    return now;
  }, buttonLabel);
  return (await waitForCalendar(page, title)) - startedAt;
}

async function measureTimings(
  page: Page,
  cdp: CDPSession,
  today: string,
  visit: Visit,
): Promise<TimingRun[]> {
  const month = today.slice(0, 'YYYY-MM'.length);
  const nextMonth = shiftMonth(month, 1);
  const runs: TimingRun[] = [];

  if (visit === 'return') {
    // 다시 방문의 준비: 한 번 열어 서비스 워커를 깔고 기기 사본을 채운다. 이 열기는 재지 않는다
    await page.goto(`${BASE_URL}/?date=${today}`);
    await waitForCalendar(page, toMonthLabel(month));
  }

  for (let run = 1; run <= TIMING_RUNS; run += 1) {
    // 처음 방문은 매번 모두 비운다. TanStack Query 캐시(메모리)는 어느 쪽이든 페이지를 새로 열면 사라진다
    if (visit === 'first') await resetToFirstVisit(cdp);

    // 첫 기록 요청: 처음 방문은 보는 달 바로 받기(26단계, 전체 동기화는 뒤에서), 다시 방문은 바뀐 것만 받는 동기화
    const recordsResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/records') &&
        response.request().method() === 'GET',
      { timeout: WAIT_TIMEOUT_MS },
    );
    // 날짜를 주소로 준다: 앱의 "오늘"은 브라우저 시간대에서 정해져서, 달이 바뀌는 시각 근처에 넣은 달과 어긋날 수 있다
    await page.goto(`${BASE_URL}/?date=${today}`, { waitUntil: 'commit' });
    const firstRecordsMs = await waitForCalendar(page, toMonthLabel(month));

    const response = await recordsResponse;
    const body = await response.body();
    const timing = response.request().timing();

    // 점이 하나도 없으면 기록을 못 그린 것(스키마 불일치·RLS 등). 그 상태의 수치는 의미가 없으니 멈춘다
    const dotCellCount = await page
      .locator('[role="gridcell"] button[aria-label*="기록"]')
      .count();
    if (dotCellCount === 0)
      throw new Error('캘린더에 기록이 그려지지 않았습니다');

    const nextMonthMs = await measureMonthSwitch(
      page,
      `${toMonthLabel(nextMonth)}로`,
      toMonthLabel(nextMonth),
    );
    const backMonthMs = await measureMonthSwitch(
      page,
      `${toMonthLabel(month)}로`,
      toMonthLabel(month),
    );

    const result = {
      firstRecordsMs,
      // 요청을 보낸 때부터 응답을 다 받은 때까지
      recordsRequestMs: timing.responseEnd,
      recordsResponseBytes: body.length,
      nextMonthMs,
      backMonthMs,
    };
    runs.push(result);
    console.log(
      `${visit === 'first' ? '처음' : '다시'} 방문 타이밍 #${run}: 첫 표시 ${Math.round(firstRecordsMs)}ms, 기록 요청 ${Math.round(timing.responseEnd)}ms, 다음 달 ${Math.round(nextMonthMs)}ms, 돌아온 달 ${Math.round(backMonthMs)}ms (칸 ${dotCellCount}개에 점)`,
    );
  }
  return runs;
}

async function measureLighthouse(
  cdp: CDPSession,
  today: string,
  visit: Visit,
): Promise<LighthouseRun[]> {
  const runs: LighthouseRun[] = [];
  for (let run = 1; run <= LIGHTHOUSE_RUNS; run += 1) {
    if (visit === 'first') await resetToFirstVisit(cdp);
    const result = await lighthouse(`${BASE_URL}/?date=${today}`, {
      port: DEBUG_PORT,
      output: 'html',
      logLevel: 'error',
      // 로그인 쿠키를 지우지 않게 (lighthouse.mts와 같은 이유)
      disableStorageReset: true,
    });
    if (!result) throw new Error('Lighthouse 결과 없음');
    await writeFile(
      join(OUT_DIR, `home-300-${visit}-${run}.html`),
      result.report as string,
    );

    const { audits, categories } = result.lhr;
    // details는 표·목록 등 여러 모양의 유니온이다. as로 단정하지 않고 type으로 좁혀서, 보고서 모양이 바뀌면 0·'알 수 없음'이 되게 한다
    const summary = audits['resource-summary'].details;
    const scriptRow =
      summary?.type === 'table'
        ? summary.items.find((item) => item.resourceType === 'script')
        : undefined;
    // LCP가 어떤 요소였는지: 기록을 받아야 그려지는 요소면 "기록 때문에 LCP가 늦다"는 가설의 근거가 된다
    const breakdown = audits['lcp-breakdown-insight']?.details;
    const lcpNode =
      breakdown?.type === 'list'
        ? breakdown.items.find((item) => item.type === 'node')
        : undefined;

    const lighthouseRun = {
      performance: Math.round((categories.performance.score ?? 0) * 100),
      fcpMs: audits['first-contentful-paint'].numericValue ?? 0,
      lcpMs: audits['largest-contentful-paint'].numericValue ?? 0,
      tbtMs: audits['total-blocking-time'].numericValue ?? 0,
      totalBytes: audits['total-byte-weight'].numericValue ?? 0,
      scriptBytes:
        typeof scriptRow?.transferSize === 'number'
          ? scriptRow.transferSize
          : 0,
      lcpElement:
        lcpNode?.type === 'node'
          ? `${lcpNode.nodeLabel ?? ''} (${lcpNode.selector ?? ''})`
          : '알 수 없음',
    };
    runs.push(lighthouseRun);
    console.log(
      `Lighthouse ${visit === 'first' ? '처음' : '다시'} 방문 #${run}: 성능 ${lighthouseRun.performance}, LCP ${Math.round(lighthouseRun.lcpMs)}ms, LCP 요소 ${lighthouseRun.lcpElement}`,
    );
  }
  return runs;
}

function toKiB(bytes: number): string {
  return `${Math.round(bytes / 1024)}KiB`;
}

// CI 실행 화면(Summary)에 바로 보이게. 아티팩트를 내려받지 않아도 수치를 docs/performance.md로 옮길 수 있다
function toMarkdown(
  visit: Visit,
  timings: TimingRun[],
  lighthouseRun: LighthouseRun,
): string {
  const pick = (key: keyof TimingRun) => timings.map((run) => run[key]);
  const row = (label: string, values: number[], unit = 'ms') =>
    `| ${label} | ${values.map((v) => Math.round(v)).join(' / ')} | **${Math.round(median(values))}${unit}** |`;
  return [
    `## 캘린더 성능 (한 달 기록 ${RECORDS_PER_MONTH}개) — ${VISIT_LABEL[visit]}`,
    '',
    `Playwright, 모바일 화면, 크롬 스로틀링(CPU ${MOBILE_SLOW_4G.cpuSlowdown}배, 지연 ${MOBILE_SLOW_4G.latencyMs}ms, 내려받기 ${MOBILE_SLOW_4G.downloadKbps}Kbps), ${TIMING_RUNS}회`,
    '',
    '| 항목 | 각 실행 | 가운데 값 |',
    '| --- | --- | --- |',
    row('홈 첫 표시 (기록까지)', pick('firstRecordsMs')),
    row('└ 그중 첫 기록 요청', pick('recordsRequestMs')),
    row('다음 달 (처음 가는 달)', pick('nextMonthMs')),
    row('돌아온 달 (캐시)', pick('backMonthMs')),
    `| 기록 응답 크기 | | **${toKiB(median(pick('recordsResponseBytes')))}** |`,
    '',
    `Lighthouse 홈 (성능 점수 가운데 실행): 성능 ${lighthouseRun.performance}, FCP ${Math.round(lighthouseRun.fcpMs)}ms, LCP ${Math.round(lighthouseRun.lcpMs)}ms, TBT ${Math.round(lighthouseRun.tbtMs)}ms, 전체 ${toKiB(lighthouseRun.totalBytes)}, JS ${toKiB(lighthouseRun.scriptBytes)}`,
    '',
    `LCP 요소: ${lighthouseRun.lcpElement}`,
    '',
  ].join('\n');
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const today = todayIn(TIME_ZONE);
  const month = today.slice(0, 'YYYY-MM'.length);
  const cookies = await createSeededGuest([month, shiftMonth(month, 1)]);

  // 영구 프로필: Lighthouse가 디버깅 포트로 연 탭도 같은 쿠키(로그인)를 보게 (lighthouse.mts와 같은 이유)
  const profileDir = join(tmpdir(), `nanaki-calendar-perf-${Date.now()}`);
  const context = await chromium.launchPersistentContext(profileDir, {
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
    // Lighthouse 모바일과 같은 화면 (Moto G Power 412×823)
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

    const results: Record<
      Visit,
      { timings: TimingRun[]; lighthouse: LighthouseRun[] }
    > = {
      first: { timings: [], lighthouse: [] },
      return: { timings: [], lighthouse: [] },
    };
    // 처음 방문을 먼저: 다시 방문의 준비(서비스 워커·사본 채우기)가 처음 방문 값에 섞이지 않게
    for (const visit of ['first', 'return'] as const) {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await throttle(cdp);
      results[visit].timings = await measureTimings(page, cdp, today, visit);
      // 스로틀링은 이 탭에만 걸려 있다. 닫아서 Lighthouse 탭(자체 조건으로 잼)에 섞이지 않게 한다
      await page.close();

      const lighthousePage = await context.newPage();
      const lighthouseCdp = await context.newCDPSession(lighthousePage);
      results[visit].lighthouse = await measureLighthouse(
        lighthouseCdp,
        today,
        visit,
      );
      await lighthousePage.close();
    }
    const medianOf = (runs: LighthouseRun[]) =>
      [...runs].sort((a, b) => a.performance - b.performance)[
        Math.floor(runs.length / 2)
      ];

    await writeFile(
      join(OUT_DIR, 'summary.json'),
      JSON.stringify(
        {
          recordsPerMonth: RECORDS_PER_MONTH,
          throttling: MOBILE_SLOW_4G,
          ...results,
        },
        null,
        2,
      ),
    );
    const markdown = (['first', 'return'] as const)
      .map((visit) =>
        toMarkdown(
          visit,
          results[visit].timings,
          medianOf(results[visit].lighthouse),
        ),
      )
      .join('\n');
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
