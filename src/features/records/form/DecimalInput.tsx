'use client';

// 'use client' 이유: 입력 중인 글자("5.")를 useState로 따로 들고 있어야 한다
import { useState } from 'react';
import TextField from '@/shared/ui/TextField';
import { formatDecimalInput, parseDecimalInput } from './inputValue';

type DecimalInputProps = {
  label: string;
  unit?: string;
  decimals: number;
  value: unknown;
  onChange: (value: number | undefined) => void;
  error?: string;
};

// 소수 입력칸 (거리 5.5km).
// 정수 칸은 폼 값(숫자)만으로 글자를 다시 그려도 되지만, 소수는 "5."를 치는 순간 값이 5라서 점이 사라진다.
// 그래서 보이는 글자는 이 컴포넌트가 들고, 폼에는 숫자 값만 넘긴다.
// 처음 글자만 폼 값에서 만든다: 이 폼은 바깥에서 값을 갈아 끼우지 않아서(reset 없음) 이후 동기화는 필요 없다
export default function DecimalInput({
  label,
  unit,
  decimals,
  value,
  onChange,
  error,
}: DecimalInputProps) {
  const [text, setText] = useState(() => formatDecimalInput(value));

  return (
    <TextField
      label={label}
      unit={unit}
      // 모바일에서 점이 있는 숫자 자판. numeric 자판에는 점이 없는 기기가 있다
      inputMode='decimal'
      value={text}
      onChange={(e) => {
        const parsed = parseDecimalInput(e.target.value, decimals);
        setText(parsed.text);
        onChange(parsed.value);
      }}
      error={error}
    />
  );
}
