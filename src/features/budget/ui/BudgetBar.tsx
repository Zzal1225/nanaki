import { barWidthPercent } from '../budgetText';

type BudgetBarProps = {
  percent: number;
  isOver: boolean;
  // 전체 예산은 굵게(8px), 분류는 얇게(6px) (시안 13a·18)
  size: 'md' | 'sm';
};

// 예산 막대. 넘으면 danger 색이지만 색만으로 알리지 않는다: 옆에 % 글자·"초과" 글자·아이콘이 함께 있다 (시안 18).
// 같은 정보가 글자로 있어서 스크린 리더에는 숨긴다
export default function BudgetBar({ percent, isOver, size }: BudgetBarProps) {
  return (
    <span
      aria-hidden='true'
      className={`block overflow-hidden rounded-full bg-surface-pressed ${size === 'md' ? 'h-2' : 'h-1.5'}`}
    >
      <span
        className={`block h-full rounded-full ${isOver ? 'bg-danger' : 'bg-type-expense'}`}
        // 길이는 데이터마다 달라서 클래스가 아니라 style로 (Tailwind는 미리 모르는 값을 만들 수 없다)
        style={{ width: `${barWidthPercent(percent)}%` }}
      />
    </span>
  );
}
