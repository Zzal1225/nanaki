'use client';

// 'use client' 이유: 화면·키보드·스크롤 숫자는 브라우저에서만 잴 수 있다
import { useEffect, useState } from 'react';

// 임시 진단 (2026-10-23). 아이폰 홈 화면 앱에서만 두 가지가 고쳐지지 않았다 (사파리 탭에서는 정상, 사용자 확인):
// 1) 작성 화면 아래 입력칸(메모·태그)이 키보드에 가린다 (KeyboardInset의 여백·스크롤이 안 먹는 것으로 보임)
// 2) 홈 맨 아래 루틴 +/− 가 + 버튼에 가린다 (본문 끝 여백 --fab-clearance가 안 먹는 것으로 보임)
// 홈 화면 앱만 문서 대신 body가 스크롤한다(globals.css, #77). 이 차이가 원인이라고 의심하지만 PC WebKit 흉내로는 재현되지 않아서,
// #77 때처럼 실제 숫자를 보고 고친다. 원인을 고치면 이 파일을 지운다.
// 홈 화면 앱(standalone)에서만 보인다: 일반 브라우저·PC·E2E·화면 비교에는 나타나지 않는다.
// 누르기를 막지 않게 pointer-events: none (진단 상자 아래 버튼도 그대로 눌린다)

type Numbers = [label: string, value: string][];

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function round(value: number | undefined): string {
  return value === undefined ? '-' : String(Math.round(value));
}

// 화면 위에서 잰 요소의 위·아래 (화면 맨 위 = 0)
function edges(element: Element | null): string {
  if (!element) return '없음';
  const rect = element.getBoundingClientRect();
  return `${round(rect.top)}~${round(rect.bottom)}`;
}

function measure(): Numbers {
  const viewport = window.visualViewport;
  const body = document.body;
  const html = document.documentElement;
  const main = document.querySelector('main');
  const focused = document.activeElement;
  const hasField =
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement;
  return [
    ['창 높이 innerHeight', round(window.innerHeight)],
    [
      '보이는 높이 vv.height / top',
      `${round(viewport?.height)} / ${round(viewport?.offsetTop)}`,
    ],
    [
      '--keyboard-inset',
      getComputedStyle(html).getPropertyValue('--keyboard-inset') || '없음',
    ],
    [
      'body 스크롤 top/전체/보임',
      `${round(body.scrollTop)} / ${round(body.scrollHeight)} / ${round(body.clientHeight)}`,
    ],
    [
      '문서 스크롤 scrollY / html',
      `${round(window.scrollY)} / ${round(html.scrollTop)}`,
    ],
    ['main 위~아래', edges(main)],
    ['main 아래 여백', main ? getComputedStyle(main).paddingBottom : '없음'],
    ['main 마지막 내용 위~아래', edges(main?.lastElementChild ?? null)],
    [
      '하단 탭 위~아래',
      edges(document.querySelector('nav[aria-label="주요 메뉴"]')),
    ],
    [
      '+ 버튼 위~아래',
      edges(document.querySelector('button[aria-label="새 기록 쓰기"]')),
    ],
    ['입력칸 위~아래', hasField ? edges(focused) : '포커스 없음'],
  ];
}

export default function StandaloneScrollDiagnostics() {
  const [numbers, setNumbers] = useState<Numbers | null>(null);

  useEffect(() => {
    if (!isStandalone()) return;
    let frame = 0;
    // 이벤트가 몰려도 한 프레임에 한 번만 잰다
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setNumbers(measure()));
    }
    schedule();
    const viewport = window.visualViewport;
    // capture: body 안에서 스크롤하는 요소의 scroll 이벤트는 퍼지지 않아서 붙잡는 단계에서 듣는다
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
    };
  }, []);

  if (!numbers) return null;
  return (
    <dl
      aria-hidden='true'
      className='pointer-events-none fixed top-2 left-2 z-[60] grid max-w-[calc(100vw-16px)] grid-cols-[auto_auto] gap-x-2 rounded-md bg-black/75 px-2 py-1 text-[10px] leading-[14px] text-white tabular-nums'
    >
      {numbers.map(([label, value]) => (
        <div key={label} className='contents'>
          <dt>{label}</dt>
          <dd className='text-right'>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
