'use client';

// 'use client' 이유: 파일 저장·고르기, 연결 상태, 기기 사본의 기록 수가 브라우저에 있다
import { Download, Info, Upload } from 'lucide-react';
import { useState } from 'react';
import SettingsSection from '@/features/settings/SettingsSection';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { BACKUP_PARSE_MESSAGE, parseBackup } from '../backupFile';
import { dataCountText, importResultMessage } from '../backupText';
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
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  async function save() {
    setMessage(null);
    try {
      const count = await exportBackup.mutateAsync();
      setMessage({
        text: `기록 ${count}개를 백업 파일로 저장했어요`,
        isError: false,
      });
    } catch {
      setMessage({
        text: '백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요',
        isError: true,
      });
    }
  }

  async function load(file: File) {
    setMessage(null);
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setMessage({ text: BACKUP_PARSE_MESSAGE[parsed.error], isError: true });
      return;
    }
    try {
      const result = await importBackup.mutateAsync(parsed.backup);
      setMessage({ text: importResultMessage(result), isError: false });
    } catch {
      setMessage({
        text: '불러오지 못했어요. 잠시 후 다시 시도해 주세요',
        isError: true,
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
      {(message ?? offlineNote) && (
        <p
          role={message?.isError ? 'alert' : 'status'}
          className={`border-t border-border px-4 py-3 text-caption ${message?.isError ? 'text-danger' : 'text-fg-secondary'}`}
        >
          {message?.text ?? offlineNote}
        </p>
      )}
    </SettingsSection>
  );
}
