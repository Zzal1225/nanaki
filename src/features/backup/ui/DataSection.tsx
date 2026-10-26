'use client';

// 'use client' 이유: 파일 저장·고르기, 연결 상태, 기기 사본의 기록 수가 브라우저에 있다
import { Download, Info, Upload } from 'lucide-react';
import { useState } from 'react';
import SettingsSection from '@/features/settings/SettingsSection';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { useToastStore } from '@/shared/toast/toastStore';
import Button from '@/shared/ui/Button';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { BACKUP_PARSE_MESSAGE, parseBackup } from '../backupFile';
import { dataCountText, importResultMessage } from '../backupText';
import { saveBackupFile, type SaveOutcome } from '../saveBackupFile';
import {
  useDataCounts,
  useExportBackup,
  useImportBackup,
} from '../hooks/useBackup';

const ROW_CLASS =
  'flex min-h-16 w-full items-center gap-3 border-t border-border px-4 py-2 text-left text-body text-fg-primary enabled:hover:bg-surface-hover disabled:text-fg-disabled';

// 설정 > 데이터 (시안 8a, step4 39): 기록·사진 수 + 백업 파일 저장하기·불러오기.
// 시안의 "저장 공간 12.4MB" 막대는 두지 않았다: 용량을 재려면 Storage를 합산하는 DB 함수가 새로 필요하다. 개수만 보여 준다
export default function DataSection() {
  const isOnline = useOnlineStatus();
  const counts = useDataCounts(isOnline);
  const exportBackup = useExportBackup();
  const importBackup = useImportBackup();
  // 저장·불러오기 결과는 토스트로 (2026-10-26 사용자 요청: 칸 아래 글자는 눈에 잘 안 띄었다).
  // 화면에 남는 글자는 "파일에 저장하기" 버튼이 필요한 경우(needsTap) 하나뿐이다: 버튼과 함께 있어야 뜻이 통한다
  const showToast = useToastStore((state) => state.showToast);

  // 아이폰에서 공유 시트가 막혔을 때(파일을 만드는 동안 시간이 지남) 한 번 더 눌러 열 파일
  const [readyFile, setReadyFile] = useState<{
    file: File;
    count: number;
  } | null>(null);

  function showOutcome(outcome: SaveOutcome, count: number, file: File) {
    setReadyFile(outcome === 'needsTap' ? { file, count } : null);
    if (outcome === 'needsTap') return;
    showToast({
      message:
        outcome === 'cancelled'
          ? '저장을 취소했어요'
          : `기록 ${count}개를 백업 파일로 저장했어요`,
    });
  }

  async function save() {
    setReadyFile(null);
    try {
      const { count, outcome, file } = await exportBackup.mutateAsync();
      showOutcome(outcome, count, file);
    } catch {
      showToast({
        message: '백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요',
        tone: 'error',
      });
    }
  }

  async function load(file: File) {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      showToast({ message: BACKUP_PARSE_MESSAGE[parsed.error], tone: 'error' });
      return;
    }
    try {
      const result = await importBackup.mutateAsync(parsed.backup);
      showToast({ message: importResultMessage(result) });
    } catch {
      showToast({
        message: '불러오지 못했어요. 잠시 후 다시 시도해 주세요',
        tone: 'error',
      });
    }
  }

  const isBusy = exportBackup.isPending || importBackup.isPending;
  const offlineNote = !isOnline ? '연결되면 저장하고 불러올 수 있어요' : null;

  return (
    <SettingsSection title='데이터'>
      <p className='px-4 py-3 text-body text-fg-primary tabular-nums'>
        {counts.records === null
          ? '기록 세는 중…'
          : dataCountText(counts.records, counts.photos)}
      </p>
      <button
        type='button'
        onClick={() => void save()}
        disabled={!isOnline || isBusy}
        className={ROW_CLASS}
      >
        <Download
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='shrink-0 text-fg-secondary'
        />
        <span className='flex flex-1 flex-col gap-1'>
          <span>
            {exportBackup.isPending ? '저장하는 중…' : '백업 파일 저장하기'}
          </span>
          <span className='flex items-center gap-1 text-caption text-fg-secondary'>
            <Info
              aria-hidden='true'
              size={14}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            사진은 백업에 포함되지 않아요
          </span>
        </span>
      </button>
      {/* 파일 고르기: input을 숨기고 label을 눌러 연다 (사진 고르기와 같은 방식) */}
      <label
        aria-disabled={!isOnline || isBusy}
        className={`${ROW_CLASS} ${!isOnline || isBusy ? 'pointer-events-none text-fg-disabled' : 'cursor-pointer hover:bg-surface-hover'}`}
      >
        {/* accept = JSON만: 아이폰은 받는 종류가 비었거나 사진을 포함하면 "사진 보관함·사진 찍기·파일 선택" 메뉴를 먼저 띄운다.
            JSON만 받으면 바로 파일 화면이 열린다 (2026-10-26 사용자 요청).
            처음엔 "JSON으로 거르면 백업 파일이 흐려진다"고 보고 accept를 없앴는데(10-25), 그때 파일은 내려받기(a[download])로 Inbox에 생긴 것이었다.
            공유 시트 "파일에 저장"으로 만든 파일은 터널로 아이폰에서 application/json·.json·json+text 셋 다 고를 수 있음을 확인했다(10-26).
            MIME과 확장자를 함께 둔다: 브라우저마다 한쪽만 보는 경우가 있다. text/plain은 다른 글 파일까지 보여서 뺐다.
            그래도 다른 파일이 들어오면 읽을 때 형식 검사(parseBackup)가 막고 이유를 알린다 */}
        <input
          type='file'
          accept='application/json,.json'
          disabled={!isOnline || isBusy}
          className='sr-only'
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void load(file);
          }}
        />
        <Upload
          aria-hidden='true'
          size={ICON_SIZE.md}
          strokeWidth={ICON_STROKE_WIDTH}
          className='shrink-0 text-fg-secondary'
        />
        <span className='flex flex-1 flex-col gap-1'>
          <span>
            {importBackup.isPending ? '불러오는 중…' : '백업 파일 불러오기'}
          </span>
          <span className='text-caption text-fg-secondary'>
            지금 기록은 그대로 두고 없는 것만 더해요
          </span>
        </span>
      </label>
      {offlineNote && (
        <p
          role='status'
          className='border-t border-border px-4 py-3 text-caption text-fg-secondary'
        >
          {offlineNote}
        </p>
      )}
      {readyFile && (
        // 이 버튼을 누르는 순간이 새 "사용자 활성화"라 공유 시트가 열린다 (saveBackupFile 설명)
        <div className='flex flex-col gap-2 border-t border-border px-4 py-3'>
          <p role='status' className='text-caption text-fg-secondary'>
            파일이 준비됐어요. 아래 버튼을 눌러 &quot;파일에 저장&quot;을
            고르세요
          </p>
          <Button
            variant='secondary'
            className='w-full'
            onClick={async () => {
              const outcome = await saveBackupFile(readyFile.file);
              showOutcome(outcome, readyFile.count, readyFile.file);
            }}
          >
            파일에 저장하기
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
