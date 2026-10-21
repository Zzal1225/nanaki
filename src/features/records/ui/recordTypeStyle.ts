import {
  Dumbbell,
  MessageSquareText,
  Ruler,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { RecordType } from '../schema/recordTypes';

type RecordTypeStyle = {
  icon: LucideIcon;
  // 아이콘·글자 색 (타입 색)
  textClass: string;
  // 아이콘을 담는 원의 옅은 배경
  subtleBgClass: string;
  // 캘린더 날짜 칸의 점 (타입 색으로 채운 원)
  dotClass: string;
};

// 화면 모양(아이콘·색)은 스키마 설정(recordTypes)과 나눠 둔다. 스키마 쪽은 서버·테스트에서도 쓰여서 UI 라이브러리를 몰라야 한다.
// 클래스는 문자열을 조합하지 않고 통째로 적는다. Tailwind는 코드에 그대로 적힌 클래스만 CSS로 만든다 (bg-type-${type} 금지)
export const RECORD_TYPE_STYLE: Record<RecordType, RecordTypeStyle> = {
  expense: {
    icon: Wallet,
    textClass: 'text-type-expense',
    subtleBgClass: 'bg-type-expense-subtle',
    dotClass: 'bg-type-expense',
  },
  review: {
    icon: MessageSquareText,
    textClass: 'text-type-review',
    subtleBgClass: 'bg-type-review-subtle',
    dotClass: 'bg-type-review',
  },
  // 시안 아이콘: dumbbell
  workout: {
    icon: Dumbbell,
    textClass: 'text-type-workout',
    subtleBgClass: 'bg-type-workout-subtle',
    dotClass: 'bg-type-workout',
  },
  // 시안 아이콘: ruler
  body: {
    icon: Ruler,
    textClass: 'text-type-body',
    subtleBgClass: 'bg-type-body-subtle',
    dotClass: 'bg-type-body',
  },
};
