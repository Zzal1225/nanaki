import type { Metadata } from 'next';
import NewRoutineForm from '@/features/routines/form/NewRoutineForm';

export const metadata: Metadata = {
  title: '루틴 만들기',
};

// 루틴은 기록이 아니라 반복 규칙이라 /records/new가 아니라 따로 둔다 (CLAUDE.md: 규칙과 수행 결과를 나눈다).
// 스피드 다이얼·사이드바의 "루틴 만들기"와 루틴 상세의 버튼이 이 주소로 온다. 저장·닫기 뒤에는 루틴 상세로 돌아간다
export default function NewRoutinePage() {
  return <NewRoutineForm doneHref='/records/type/routine' />;
}
