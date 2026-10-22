import { useQuery } from '@tanstack/react-query';
import { listLatestRecordsWithField } from '../api/recordStore';
import type { RecordEntryOf } from '../schema/recordEntry';
import { roundToOneDecimal } from '../ui/recordPresentation';
import { recordKeys } from './recordKeys';

// 마지막 체중과 바로 전 체중, 두 개면 차이를 낼 수 있다
const LATEST_WEIGHT_COUNT = 2;

export type LatestWeight = {
  weight: number;
  // 바로 전 체중 기록과의 차이(kg, 소수 한 자리). 체중 기록이 하나뿐이면 null
  change: number | null;
};

// 체형 상세의 "최근 체중 68.4kg(-0.4kg)" (2026-10-22 사용자 결정).
// 보고 있는 달과 상관없이 전체 기록 중 마지막 체중과 그 바로 전 체중을 비교한다
// (이 달 첫 기록이면 지난달 마지막 체중과). 그래서 타입 상세의 "이 달 기록" 조회와 따로 부른다
export function useLatestWeight() {
  return useQuery({
    queryKey: recordKeys.latestWithField('body', 'weight', LATEST_WEIGHT_COUNT),
    queryFn: () =>
      listLatestRecordsWithField('body', 'weight', LATEST_WEIGHT_COUNT),
    select: (entries): LatestWeight | null => {
      // 'body' 타입만, fields.weight가 있는 줄만 조회했다
      const [latest, before] = entries as RecordEntryOf<'body'>[];
      const weight = latest?.fields.weight;
      if (weight === undefined) return null;
      const previous = before?.fields.weight;
      return {
        weight,
        change:
          previous === undefined ? null : roundToOneDecimal(weight - previous),
      };
    },
  });
}
