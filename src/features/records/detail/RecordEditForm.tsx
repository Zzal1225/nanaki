'use client';

// 'use client' 이유: 고칠 기록을 브라우저에서 불러온 뒤 폼에 넣는다
import Link from 'next/link';
import RecordForm from '../form/RecordForm';
import { useRecord } from '../hooks/useRecord';

type RecordEditFormProps = {
  id: string;
};

// 기록을 불러온 다음에 폼을 그린다. 폼의 처음 값(defaultValues)은 처음 그릴 때 한 번만 읽혀서,
// 불러오기 전에 빈 폼을 먼저 그리면 나중에 값이 와도 칸이 채워지지 않는다
export default function RecordEditForm({ id }: RecordEditFormProps) {
  const { data: entry, isPending, isError } = useRecord(id);

  if (isPending) {
    return (
      <div
        aria-busy='true'
        className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-6'
      >
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
        <div className='h-12 animate-pulse rounded-md bg-surface-hover' />
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div
        role='alert'
        className='flex flex-col items-start gap-3 px-4 py-6 md:px-6'
      >
        <p className='text-body text-fg-primary'>
          {isError ? '기록을 불러오지 못했어요.' : '기록을 찾을 수 없어요.'}
        </p>
        <Link
          href='/records'
          className='text-body-sm font-semibold text-accent underline underline-offset-4'
        >
          기록 탭으로
        </Link>
      </div>
    );
  }

  return <RecordForm mode='edit' entry={entry} />;
}
