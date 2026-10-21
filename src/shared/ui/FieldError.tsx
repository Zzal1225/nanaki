import { CircleAlert } from 'lucide-react';
import { ICON_SIZE, ICON_STROKE_WIDTH } from './icon';

type FieldErrorProps = {
  // 입력칸의 aria-describedby가 가리키는 id. 스크린 리더가 입력칸을 읽을 때 이 문구도 함께 읽는다
  id: string;
  message?: string;
};

// 시안: 오류 문구 앞에 경고 아이콘. 색만으로 오류를 알리지 않도록(색각 이상) 아이콘을 함께 둔다.
// 모든 입력칸이 이 컴포넌트를 써서 오류 모양이 한 곳에서 정해진다
export default function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <span id={id} className='flex items-center gap-1 text-caption text-danger'>
      <CircleAlert
        aria-hidden='true'
        size={ICON_SIZE.sm}
        strokeWidth={ICON_STROKE_WIDTH}
        className='shrink-0'
      />
      {message}
    </span>
  );
}
