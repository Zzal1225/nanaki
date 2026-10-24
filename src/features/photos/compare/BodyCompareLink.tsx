'use client';

// 'use client' 이유: 사진 날짜(온라인)·계정 종류를 브라우저에서 읽어 비교할 수 있을 때만 보인다
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useOnlineStatus } from '@/shared/network/useOnlineStatus';
import { ICON_SIZE, ICON_STROKE_WIDTH } from '@/shared/ui/icon';
import { usePhotoDates } from '../hooks/usePhotos';
import {
  bodyCompareHref,
  pickPhotoByDate,
  type CompareKind,
} from './bodyCompare';

type BodyCompareLinkProps = {
  // 기록 상세에서 열면 그 기록 날짜를 비교 날짜 하나로 넣는다. 타입 상세에서는 없음(처음 → 최근)
  recordDate?: string;
  // 기록 상세: 그 기록에 사진이 있는 자세만 (사진이 없는 기록에서 "이 사진 비교"는 뜻이 없다)
  kinds?: readonly CompareKind[];
  label: string;
};

// 눈바디 비교로 가는 입구 (2026-10-24 사용자 결정: 체형 타입 상세 + 기록 상세). 비교할 수 있을 때만 보인다:
// 같은 자세 사진이 2개 날짜 이상, 또는 체험 계정(예시 실루엣으로 동작을 보여 준다). 오프라인이면 숨긴다 (사진은 온라인 전용)
export default function BodyCompareLink({
  recordDate,
  kinds = ['front', 'side'],
  label,
}: BodyCompareLinkProps) {
  const isOnline = useOnlineStatus();
  const user = useCurrentUser();
  const front = usePhotoDates('front', isOnline && kinds.includes('front'));
  const side = usePhotoDates('side', isOnline && kinds.includes('side'));
  if (!isOnline) return null;

  const datesOf = (kind: CompareKind) => [
    ...pickPhotoByDate(
      (kind === 'front' ? front.data : side.data) ?? [],
    ).keys(),
  ];
  // 정면을 먼저 (비교할 수 있는 자세 중)
  const kind = kinds.find((candidate) => datesOf(candidate).length >= 2);
  const isGuestDemo = !kind && !recordDate && user.data?.isAnonymous === true;
  if (!kind && !isGuestDemo) return null;

  const dates = kind ? datesOf(kind) : [];
  // 이 기록이 가장 앞 날짜면 앞쪽에 두고 뒤는 최근 사진, 아니면 뒤쪽에 두고 앞은 처음 사진
  const href = !kind
    ? bodyCompareHref({})
    : !recordDate
      ? bodyCompareHref({ kind })
      : recordDate === [...dates].sort()[0]
        ? bodyCompareHref({ kind, from: recordDate })
        : bodyCompareHref({ kind, to: recordDate });

  return (
    <Link
      href={href}
      className='-mx-2 inline-flex min-h-11 items-center gap-1 self-start rounded-md px-2 text-body-sm font-semibold text-accent hover:bg-surface-hover active:bg-surface-pressed'
    >
      {label}
      <ChevronRight
        aria-hidden='true'
        size={ICON_SIZE.sm}
        strokeWidth={ICON_STROKE_WIDTH}
      />
    </Link>
  );
}
