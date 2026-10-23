import type { ReactNode } from 'react';
import ExpenseCreateForm from '@/features/fixedExpenses/ui/ExpenseCreateForm';
import RecordForm from '../form/RecordForm';
import type { RecordType } from '../schema/recordTypes';

// 새로 쓰기 화면에서 타입마다 다른 폼을 쓸 때 여기 한 곳에 적는다 (타입 상세의 typeSummaryCards와 같은 방식):
// 화면(NewRecordFromUrl)에 if (type === 'expense')를 흩뿌리지 않는다 (CLAUDE.md).
// 가계부: 금액 옆 "고정지출" 체크 (features/fixedExpenses). 나머지는 기본 폼.
// 컴포넌트를 골라 돌려주지 않고 "그려 주는 함수"인 이유: 렌더 중에 컴포넌트를 고르면 React 컴파일러 규칙(static-components)이
// 매번 새 컴포넌트로 보아 상태를 잃을 수 있다고 막는다
export type CreateFormProps = {
  type: RecordType;
  date?: string;
  doneHref?: string;
};

type CreateFormRenderer = (props: CreateFormProps) => ReactNode;

const CREATE_FORMS: Partial<Record<RecordType, CreateFormRenderer>> = {
  expense: ({ date, doneHref }) => (
    <ExpenseCreateForm date={date} doneHref={doneHref} />
  ),
};

export function renderCreateForm(props: CreateFormProps): ReactNode {
  const render = CREATE_FORMS[props.type];
  if (render) return render(props);
  return (
    <RecordForm
      mode='create'
      type={props.type}
      date={props.date}
      doneHref={props.doneHref}
    />
  );
}
