// 백업 파일을 기기에 저장하는 방법 고르기 (2026-10-25 아이폰 확인 12).
// 아이폰 홈 화면 앱에서 a[download]로 내려받으면 파일 앱의 숨은 "Inbox"에 들어가, 불러오기의 파일 고르기에서 찾기 어려웠다.
// 그래서 손가락 기기에서 파일 공유를 지원하면 공유 시트를 연다: 사용자가 "파일에 저장"과 보이는 폴더(나의 iPhone > 다운로드 등)를
// 직접 골라, 불러올 때 같은 곳에서 찾는다 (보고서 PDF와 같은 흐름). PC는 그대로 다운로드 폴더로 내려받는다
// (PC 크롬도 파일 공유를 지원하지만, 다운로드 대신 낯선 공유 창이 뜨면 어색하다)

export type SaveOutcome =
  // 공유 시트에서 저장(또는 다른 앱으로 보내기)까지 마쳤다
  | 'shared'
  | 'downloaded'
  // 공유 시트를 닫았다
  | 'cancelled'
  // 버튼을 누른 지 오래돼(파일을 만드는 동안 서버를 기다림) 브라우저가 공유를 막았다 → 한 번 더 눌러야 한다
  | 'needsTap';

function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    navigator.canShare({ files: [file] })
  );
}

// a[download]로 내려받는다. 주소는 클릭 뒤 바로 닫는다 (파일이 메모리에 남지 않게)
function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function toBackupFile(value: unknown, name: string): File {
  return new File([JSON.stringify(value, null, 2)], name, {
    type: 'application/json',
  });
}

// 공유 시트는 "버튼을 누른 직후"에만 열린다(사용자 활성화). 파일을 만드는 동안 서버를 기다리면 그 시간이 지나
// NotAllowedError가 난다 → 'needsTap'을 돌려주고, 화면이 "파일에 저장하기" 버튼으로 한 번 더 누르게 한다
export async function saveBackupFile(file: File): Promise<SaveOutcome> {
  if (!canShareFile(file)) {
    download(file);
    return 'downloaded';
  }
  try {
    await navigator.share({ files: [file], title: file.name });
    return 'shared';
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'AbortError') return 'cancelled';
    if (name === 'NotAllowedError') return 'needsTap';
    // 공유가 다른 이유로 실패하면 내려받기로라도 남긴다
    download(file);
    return 'downloaded';
  }
}
