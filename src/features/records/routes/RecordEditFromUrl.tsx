'use client';

// 'use client' 이유: 고칠 기록 id를 주소에서 브라우저가 읽는다 (서버 HTML을 기록마다 같게, recordRoutes 설명)
import { usePathname } from 'next/navigation';
import RecordEditForm from '../detail/RecordEditForm';
import { recordIdFromPath } from './recordRoutes';

// /records/<id>/edit
export default function RecordEditFromUrl() {
  const id = recordIdFromPath(usePathname());
  if (!id) return null;
  // key: 폼의 처음 값은 처음 그릴 때 한 번만 읽힌다. 다른 기록으로 옮겨 가면 폼을 새로 만든다
  return <RecordEditForm key={id} id={id} />;
}
