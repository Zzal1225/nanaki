import type { Metadata } from 'next';
import NewRoutineForm from '@/features/routines/form/NewRoutineForm';

export const metadata: Metadata = {
  title: '루틴 만들기',
};

// 루틴은 기록이 아니라 반복 규칙이라 /records/new가 아니라 따로 둔다 (CLAUDE.md: 규칙과 수행 결과를 나눈다).
// 아직 메뉴에서 이 주소로 오는 길은 없다: 체크(수행 기록)가 생기는 23b에서 스피드 다이얼·사이드바에 연결한다
// (CLAUDE.md: 미구현 기능은 숨김)
export default function NewRoutinePage() {
  return <NewRoutineForm doneHref='/' />;
}
