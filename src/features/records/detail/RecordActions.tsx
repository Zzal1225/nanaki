'use client';

// 'use client' 이유: 메뉴 열림, 삭제 요청, 화면 이동이 브라우저에서 일어난다
import { DropdownMenu } from 'radix-ui';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { useToastStore } from '@/shared/toast/toastStore';
import { useDeleteRecord } from '../hooks/useDeleteRecord';

type RecordActionsProps = {
  id: string;
};

const MENU_ITEM_CLASS =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-body-sm font-medium outline-none data-highlighted:bg-surface-hover';

// 상세 위쪽 오른쪽의 동작들. 모바일은 좁아서 ⋯ 메뉴에 수정·삭제를 넣고, PC는 수정·삭제를 모두 버튼으로 꺼내 둔다.
// 시안은 PC도 삭제를 ⋯에 숨겼지만, 넓은 화면에서 한 번 더 누를 이유가 없고 삭제는 5초 되돌리기가 있어 바꿨다
// (private/decisions/2026-10-21-pc-record-actions.md). 폭에 따른 차이는 CSS(lg:hidden / hidden lg:inline-flex)로만
export default function RecordActions({ id }: RecordActionsProps) {
  const router = useRouter();
  const deleteRecord = useDeleteRecord();
  const showToast = useToastStore((state) => state.showToast);
  const editHref = `/records/${id}/edit`;

  async function handleDelete() {
    try {
      await deleteRecord.mutateAsync(id);
      // 시안: 지운 뒤 홈으로 돌아와 되돌리기 토스트. replace라 뒤로 가기로 지운 기록 화면에 돌아오지 않는다
      router.replace('/');
    } catch {
      showToast({ message: '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    }
  }

  return (
    <div className='ml-auto flex items-center gap-1 lg:gap-3'>
      <Link
        href={editHref}
        className='hidden min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-semibold text-fg-primary hover:bg-surface-hover active:bg-surface-pressed lg:inline-flex'
      >
        <Pencil
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        수정
      </Link>
      {/* 수정과 간격(gap-3)을 두고 빨간 글자 보조 버튼으로: 눈에 띄되 수정을 누르려다 잘못 누르지 않게 */}
      <button
        type='button'
        onClick={() => void handleDelete()}
        disabled={deleteRecord.isPending}
        className='hidden min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-semibold text-danger hover:bg-surface-hover active:bg-surface-pressed disabled:text-fg-disabled lg:inline-flex'
      >
        <Trash2
          aria-hidden='true'
          size={ICON_SIZE.sm}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        삭제
      </button>
      {/* 모바일·태블릿 전용 */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label='더보기'
          disabled={deleteRecord.isPending}
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover active:bg-surface-pressed disabled:text-fg-disabled lg:hidden'
        >
          <Ellipsis
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align='end'
            sideOffset={4}
            className='z-40 min-w-40 rounded-md border border-border bg-surface-raised p-1 shadow-float'
          >
            <DropdownMenu.Item asChild>
              <Link
                href={editHref}
                className={`${MENU_ITEM_CLASS} text-fg-primary`}
              >
                <Pencil
                  aria-hidden='true'
                  size={ICON_SIZE.md}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                수정
              </Link>
            </DropdownMenu.Item>
            {/* 시안: 확인 창 없이 바로 지운다. 대신 5초 동안 되돌리기를 준다 */}
            <DropdownMenu.Item
              onSelect={() => void handleDelete()}
              className={`${MENU_ITEM_CLASS} text-danger`}
            >
              <Trash2
                aria-hidden='true'
                size={ICON_SIZE.md}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              삭제
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
