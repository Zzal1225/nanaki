import { addDaysTo } from '@/shared/date/calendar';
import type { DistributiveOmit, NewRecordInput } from '../api/recordStore';

// "로그인 없이 체험하기"로 들어온 사람이 빈 화면 대신 바로 둘러볼 수 있게 넣는 예시 기록.
// 날짜는 고정값이 아니라 "오늘에서 며칠 전"으로 둔다: 언제 체험해도 최근 2주 안에 점이 찍히고,
// 미래 날짜는 쓰지 않는다 (아직 일어나지 않은 일을 기록한 것처럼 보이지 않게)

type SampleTemplate = {
  // 오늘에서 며칠 전 (0 = 오늘)
  daysAgo: number;
  // 그냥 Omit을 쓰면 유니온이 하나로 뭉개져 type과 fields의 짝(가계부면 금액·분류)을 검사하지 못한다
  record: DistributiveOmit<NewRecordInput, 'occurredAt'>;
};

// 가계부는 분류·결제수단을 고루 섞어 타입 상세의 분류별 막대가 여러 줄 나오게 하고,
// 후기는 대상 종류를 섞어 요약 카드의 종류별 개수가 채워지게 한다
const SAMPLE_TEMPLATES: readonly SampleTemplate[] = [
  {
    daysAgo: 0,
    record: {
      type: 'expense',
      title: '점심',
      memo: null,
      tags: ['회사'],
      fields: { amount: 9800, category: '식비', paymentMethod: '카드' },
    },
  },
  {
    daysAgo: 0,
    record: {
      type: 'expense',
      title: '택시',
      memo: '비가 와서 탔다',
      tags: [],
      fields: { amount: 7000, category: '교통', paymentMethod: '카드' },
    },
  },
  {
    daysAgo: 1,
    record: {
      type: 'expense',
      title: '아메리카노',
      memo: null,
      tags: [],
      fields: { amount: 4500, category: '카페', paymentMethod: '카드' },
    },
  },
  {
    daysAgo: 1,
    record: {
      type: 'review',
      title: '동네 로스터리',
      memo: '산미 있는 원두가 좋았다. 자리는 좁은 편',
      tags: ['재방문'],
      fields: { rating: 4, targetKind: '장소' },
    },
  },
  {
    daysAgo: 3,
    record: {
      type: 'expense',
      title: '장보기',
      memo: null,
      tags: ['마트'],
      fields: { amount: 32400, category: '생활', paymentMethod: '카드' },
    },
  },
  {
    daysAgo: 4,
    record: {
      type: 'review',
      title: '무선 이어폰',
      memo: '노이즈 캔슬링이 생각보다 강하다',
      tags: [],
      fields: { rating: 5, targetKind: '제품' },
    },
  },
  {
    daysAgo: 6,
    record: {
      type: 'expense',
      title: '저녁 약속',
      memo: null,
      tags: ['친구'],
      fields: { amount: 28000, category: '식비', paymentMethod: '계좌이체' },
    },
  },
  {
    daysAgo: 8,
    record: {
      type: 'expense',
      title: '운동화',
      memo: null,
      tags: [],
      fields: { amount: 89000, category: '쇼핑', paymentMethod: '카드' },
    },
  },
  {
    daysAgo: 9,
    record: {
      type: 'review',
      title: '다큐멘터리 한 편',
      memo: null,
      tags: [],
      fields: { rating: 3, targetKind: '콘텐츠' },
    },
  },
  {
    daysAgo: 11,
    record: {
      type: 'expense',
      title: '버스 충전',
      memo: null,
      tags: [],
      fields: { amount: 20000, category: '교통', paymentMethod: '현금' },
    },
  },
  {
    daysAgo: 12,
    record: {
      type: 'review',
      title: '한강 자전거',
      memo: '해 질 무렵이 제일 좋다',
      tags: [],
      fields: { rating: 5, targetKind: '경험' },
    },
  },
  {
    daysAgo: 13,
    record: {
      type: 'expense',
      title: '약국',
      memo: null,
      tags: [],
      fields: { amount: 6500, category: '의료', paymentMethod: '카드' },
    },
  },
];

// today('YYYY-MM-DD', 브라우저의 오늘)를 기준으로 날짜를 채운 예시 기록들.
// 오늘을 받는 이유: 여기서 new Date()를 부르면 테스트마다 결과가 달라진다
export function buildSampleRecords(today: string): NewRecordInput[] {
  return SAMPLE_TEMPLATES.map(({ daysAgo, record }) => ({
    ...record,
    occurredAt: addDaysTo(today, -daysAgo),
  }));
}
