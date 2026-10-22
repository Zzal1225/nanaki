'use client';

// 'use client' 이유: 기기 화면 숫자(안전 영역, 화면 높이)는 브라우저에서만 잴 수 있다

import { useEffect, useState } from 'react';

// 임시 진단 (2026-10-22): 아이폰 홈 화면 앱에서 스크롤하면 글자가 상태 표시줄(시계)과 겹친다.
// 상태 표시줄 뒤를 가리는 띠(app/layout.tsx)는 env(safe-area-inset-top) 높이인데, iOS 26 홈 화면 앱에서는
// 이 값이 0이라는 보고가 있다 (WebKit 301994, 커뮤니티 자료). 짐작으로 높이를 넣으면 기종마다 틀리므로
// 실제 숫자를 보고 고친다. 원인을 고치면 이 파일을 지운다.
// 홈 화면 앱(standalone)에서만 보인다: 일반 브라우저·PC·화면 비교 테스트에는 나타나지 않는다

type ScreenNumbers = Record<string, string>;

// env() 값은 자바스크립트로 바로 읽을 수 없어서, 그 값을 여백으로 가진 보이지 않는 칸을 만들어 잰다
function readEnvInset(side: 'top' | 'bottom'): string {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;padding-${side}:env(safe-area-inset-${side})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(`padding-${side}`);
  probe.remove();
  return value;
}

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function measure(): ScreenNumbers {
  const iosVersion = /OS (\d+[_\d]*) like Mac OS X/.exec(navigator.userAgent);
  return {
    iOS: iosVersion ? iosVersion[1].replaceAll('_', '.') : '알 수 없음',
    'safe-area top': readEnvInset('top'),
    'safe-area bottom': readEnvInset('bottom'),
    'screen.height': String(window.screen.height),
    innerHeight: String(window.innerHeight),
    'visualViewport.height': String(
      Math.round(window.visualViewport?.height ?? 0),
    ),
    clientHeight: String(document.documentElement.clientHeight),
    // 맨 위에 있을 때 본문이 화면 위에서 얼마나 떨어져 시작하는지
    'body top': String(Math.round(document.body.getBoundingClientRect().top)),
    scrollY: String(Math.round(window.scrollY)),
  };
}

export default function DeviceScreenInfo() {
  const [numbers, setNumbers] = useState<ScreenNumbers | null>(null);

  useEffect(() => {
    if (!isStandalone()) return;
    // 마운트 뒤에 한 번 잰다 (서버 HTML에는 없는 값이라 effect 안에서). 외부(기기) 값을 화면 상태로 옮기는 일이다
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기기 값은 마운트 뒤에만 읽을 수 있다
    setNumbers(measure());
  }, []);

  if (!numbers) return null;
  return (
    <section
      aria-labelledby='device-screen-info'
      className='flex flex-col gap-2'
    >
      <h2
        id='device-screen-info'
        className='px-1 text-body-sm font-semibold text-fg-secondary'
      >
        화면 진단 (임시)
      </h2>
      <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-surface px-4 py-3 text-body-sm shadow-card'>
        {Object.entries(numbers).map(([name, value]) => (
          <div key={name} className='contents'>
            <dt className='text-fg-secondary'>{name}</dt>
            <dd className='text-right text-fg-primary tabular-nums'>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
