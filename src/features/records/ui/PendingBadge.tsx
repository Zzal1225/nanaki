import { CloudUpload } from 'lucide-react';
import { ICON_STROKE_WIDTH } from '@/shared/ui/icon';

// 줄 글자(caption 12px) 옆에 맞는 크기 (시안 15a의 구름과 같다)
const PENDING_ICON_SIZE = 14;

// 아직 서버에 보내지 않은 기록 표시. 기록 탭·타입·검색 목록과 홈 하루 요약이 같은 모양을 쓴다.
// 처음에는 회색 구름 아이콘만 있었는데 아이폰에서 찾기 어려웠다 (2026-10-22 아이폰 확인 6번) →
// 오프라인 배너와 같은 경고색 + "저장 대기" 글자. 글자가 있어서 화면 읽기 프로그램도 따로 이름(aria-label)이 필요 없다
export default function PendingBadge() {
  return (
    <span className='inline-flex shrink-0 items-center gap-0.5 text-caption font-semibold text-warning'>
      <CloudUpload
        aria-hidden='true'
        size={PENDING_ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      저장 대기
    </span>
  );
}
