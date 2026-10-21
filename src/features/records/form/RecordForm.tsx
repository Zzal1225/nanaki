'use client';

// 'use client' 이유: 입력 상태(React Hook Form), 저장 요청, 화면 이동이 모두 브라우저에서 일어난다
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Controller,
  useForm,
  useWatch,
  type DefaultValues,
} from 'react-hook-form';
import type { z } from 'zod';
import { toLocalDateString } from '@/shared/date/toLocalDateString';
import Button from '@/shared/ui/Button';
import DateField from '@/shared/ui/DateField';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import TagInput from '@/shared/ui/TagInput';
import TextArea from '@/shared/ui/TextArea';
import TextField from '@/shared/ui/TextField';
import { useCreateRecord } from '../hooks/useCreateRecord';
import { useUpdateRecord } from '../hooks/useUpdateRecord';
import {
  MAX_MEMO_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
  type RecordEntry,
} from '../schema/recordEntry';
import { RECORD_TYPE_CONFIG, type RecordType } from '../schema/recordTypes';
import FieldInput from './FieldInput';
import { emptyToNull } from './inputValue';

// 폼 값의 타입은 타입별 폼 스키마에서 뽑는다. input = 검증 전(입력 중), output = 검증을 통과한 값
type FormSchema = (typeof RECORD_TYPE_CONFIG)[RecordType]['formSchema'];
type FormInput = z.input<FormSchema>;
type FormOutput = z.output<FormSchema>;

// 새로 쓰기: type만, 고치기: 고칠 기록(entry)까지. 같은 폼을 써서 입력칸·검증이 두 화면에서 어긋나지 않는다
type RecordFormProps =
  { mode: 'create'; type: RecordType } | { mode: 'edit'; entry: RecordEntry };

// 폼의 처음 값. DefaultValues는 "일부만 채워도 되는" 모양이라 새로 쓰기에서 fields를 비워 둘 수 있다.
// 고치기는 기록을 그대로 넣는다. id가 함께 들어가도 폼 스키마(id 없음)가 제출 때 검사하며 지워서,
// 저장할 때 id를 다시 붙인다
function toDefaultValues(props: RecordFormProps): DefaultValues<FormInput> {
  if (props.mode === 'edit') return props.entry;
  return {
    type: props.type,
    occurredAt: toLocalDateString(new Date()),
    title: '',
    memo: null,
    tags: [],
    // fields는 비워 둔다. 입력칸이 처음엔 비어 있고, 안 채우면 필수 칸 오류가 나야 해서
  };
}

export default function RecordForm(props: RecordFormProps) {
  const type = props.mode === 'edit' ? props.entry.type : props.type;
  const config = RECORD_TYPE_CONFIG[type];
  const editingId = props.mode === 'edit' ? props.entry.id : null;
  // 고치기에서 닫거나 저장하면 그 기록의 상세로, 새로 쓰기는 홈으로
  const doneHref = editingId ? `/records/${editingId}` : '/';

  const form = useForm<FormInput, unknown, FormOutput>({
    // 제출할 때 타입별 폼 스키마로 검사하고, 실패하면 칸마다 오류를 넣는다 (검증 규칙을 한 곳에서만 관리)
    resolver: zodResolver(config.formSchema),
    defaultValues: toDefaultValues(props),
  });
  // watch 대신 useWatch: 메모 칸이 바뀔 때 이 폼 전체가 아니라 필요한 값만 구독한다
  const memo = useWatch({ control: form.control, name: 'memo' });
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  // 두 mutation 중 이 화면이 쓰는 것. 저장 버튼 로딩·실패 문구가 이것만 본다
  const saving = editingId ? updateRecord : createRecord;
  const router = useRouter();

  async function onSubmit(values: FormOutput) {
    try {
      if (editingId) {
        await updateRecord.mutateAsync({ ...values, id: editingId });
      } else {
        await createRecord.mutateAsync(values);
      }
      // push가 아니라 replace: 뒤로 가기로 방금 저장한 폼에 돌아오면 같은 기록을 또 저장할 수 있다
      router.replace(doneHref);
    } catch {
      // 오류 문구는 아래 saving.error로 보여 준다. 잡지 않으면 처리 안 된 Promise 오류로 콘솔에 남는다
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      // 브라우저 기본 검사 말풍선 대신 Zod 오류 문구를 칸 아래에 보여 준다
      noValidate
      className='mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-4 md:px-6'
    >
      {/* 시안: 왼쪽 닫기(×), 가운데 제목. 오른쪽 빈칸은 제목을 정확히 가운데 두기 위한 자리 */}
      <div className='-mx-4 flex h-14 items-center px-1 md:-mx-6 md:px-3'>
        <Link
          href={doneHref}
          // 닫으면 작성 화면을 방문 기록에서 지운다. 뒤로 가기로 쓰다 만 폼에 돌아오지 않게
          replace
          aria-label='닫기'
          className='inline-flex size-11 items-center justify-center rounded-md text-fg-primary hover:bg-surface-hover'
        >
          <X
            aria-hidden='true'
            size={ICON_SIZE.lg}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </Link>
        <h1 className='flex-1 text-center text-body font-semibold text-fg-primary'>
          {config.label} {editingId ? '수정' : '쓰기'}
        </h1>
        <span aria-hidden='true' className='size-11' />
      </div>

      <Controller
        control={form.control}
        name='occurredAt'
        render={({ field: input, fieldState }) => (
          <DateField
            label='날짜'
            value={input.value}
            onChange={input.onChange}
            onBlur={input.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      {/* 타입별 필드: 정의 배열 순서대로 그린다 (시안: 날짜와 구분선 사이에만 들어간다) */}
      {config.fields.map((field) => (
        <Controller
          key={field.name}
          control={form.control}
          name={`fields.${field.name}`}
          render={({ field: input, fieldState }) => (
            <FieldInput
              field={field}
              value={input.value}
              onChange={input.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      ))}

      <hr className='border-border' />

      <TextField
        label='제목'
        placeholder='제목을 입력하세요'
        maxLength={MAX_TITLE_LENGTH}
        error={form.formState.errors.title?.message}
        {...form.register('title')}
      />

      <Controller
        control={form.control}
        name='tags'
        render={({ field: input, fieldState }) => (
          <TagInput
            label='태그 (선택)'
            value={input.value}
            onChange={input.onChange}
            maxTags={MAX_TAGS}
            maxTagLength={MAX_TAG_LENGTH}
            error={fieldState.error?.message}
          />
        )}
      />

      <TextArea
        label='메모 (선택)'
        maxLength={MAX_MEMO_LENGTH}
        length={memo?.length ?? 0}
        error={form.formState.errors.memo?.message}
        {...form.register('memo', {
          // 빈 칸은 null로: DB에서 메모 "없음"은 null이다
          setValueAs: emptyToNull,
        })}
      />

      {/* 모바일에서 저장 버튼이 하단 탭 바로 위에 붙어 있게 한다 (--tab-bar-height에 홈 막대 여백이 이미 들어 있다) */}
      <div className='sticky bottom-(--tab-bar-height) -mx-4 flex flex-col gap-2 bg-bg px-4 py-3 md:bottom-0 md:-mx-6 md:px-6'>
        {saving.error && (
          <p role='alert' className='text-caption text-danger'>
            저장하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <Button type='submit' isLoading={saving.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}
