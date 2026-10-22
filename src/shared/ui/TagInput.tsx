'use client';

// 'use client' 이유: 아직 태그가 되지 않은 입력 글자를 상태로 들고 있어야 한다
import { X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';
import FieldError from './FieldError';
import { splitTagDraft } from './tagDraft';
import { removeWhitespace } from '@/shared/text/removeWhitespace';

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  maxTags: number;
  maxTagLength: number;
  error?: string;
};

export default function TagInput({
  label,
  value,
  onChange,
  maxTags,
  maxTagLength,
  error,
}: TagInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [draft, setDraft] = useState('');
  const hasError = Boolean(error);
  const isFull = value.length >= maxTags;

  function addDraft() {
    // 태그는 띄어쓰기 없는 한 단어 (스페이스는 태그 끝내기, tagDraft)
    const tag = removeWhitespace(draft);
    // 빈 값·중복은 조용히 무시한다. 길이·개수 제한은 입력칸 maxLength와 isFull이 미리 막는다
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter는 조합을 끝내는 키라서 무시한다. 안 그러면 마지막 글자가 한 번 더 들어간다
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    // 폼 안의 Enter는 제출이 기본 동작이라 막는다
    e.preventDefault();
    addDraft();
  }

  return (
    <div className='flex flex-col gap-2'>
      <label
        htmlFor={inputId}
        className='text-body-sm font-medium text-fg-primary'
      >
        {label}
      </label>
      {value.length > 0 && (
        <ul className='flex flex-wrap gap-2' aria-label={`${label} 목록`}>
          {value.map((tag) => (
            <li
              key={tag}
              className='inline-flex h-7 items-center gap-1 rounded-full bg-surface-pressed pr-1 pl-3 text-body-sm text-fg-primary'
            >
              #{tag}
              <button
                type='button'
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`${tag} 태그 지우기`}
                // 보이는 칩은 28px이지만 누르는 영역은 44px로 넓힌다
                className='-m-2 inline-flex size-11 items-center justify-center text-fg-secondary'
              >
                <X
                  aria-hidden='true'
                  size={ICON_SIZE.sm}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={inputId}
        value={draft}
        onChange={(e) => {
          // 공백이 들어오면 그 앞까지를 태그로 (스페이스·붙여 넣기 모두)
          const next = splitTagDraft(e.target.value, value, maxTags);
          if (next.tags.length !== value.length) onChange(next.tags);
          setDraft(next.draft);
        }}
        onKeyDown={handleKeyDown}
        // 모바일 키보드의 "완료"로 Enter가 안 오는 기기도 있어서 칸을 떠날 때도 태그로 만든다
        onBlur={addDraft}
        maxLength={maxTagLength}
        disabled={isFull}
        enterKeyHint='done'
        placeholder={
          isFull ? `태그는 ${maxTags}개까지` : '태그 입력 후 스페이스·Enter'
        }
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`h-12 rounded-md border bg-surface px-4 text-body text-fg-primary outline-none placeholder:text-fg-secondary disabled:bg-surface-pressed ${
          hasError
            ? 'border-danger ring-1 ring-danger'
            : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
        }`}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
