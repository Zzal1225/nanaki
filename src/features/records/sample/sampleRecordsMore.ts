import type { DistributiveOmit, NewRecordInput } from '../api/recordStore';

// 체험하기 예시 기록 추가분 64개 (2026-10-25 사용자 요청: 면접관이 체험할 때 더 다양하게 보이게).
// sampleRecords.ts의 기본 예시(최근 2주)를 6주로 넓히고, 비슷한 기록이 반복되지 않게 고른다:
// - 가계부: 기본 분류 + 직접 입력 분류(구독·문화·경조사·여행·운동)와 결제수단(간편결제) → 분류별 막대가 길어지고,
//   나키가 "사용자가 만든 이름"을 조건으로 잡는 모습(예: "구독에 얼마 썼어?")을 체험에서 볼 수 있다
// - 후기: 별점 1~5가 모두 있다(좋은 후기만 있으면 별점 필터·정렬이 의미 없다), 대상 종류 네 가지
// - 운동: 기본 종목 + 직접 입력(클라이밍·등산·배드민턴), 거리 있는 종목과 없는 종목
// - 체형: 6주 동안 체중이 조금씩 내려가 그래프가 그려지고, 허리둘레는 2주에 한 번
// - 며칠 이어지는 여행(교통·숙소·기념품·장소 후기·산책)이 같은 태그로 묶인다 → 태그 검색이 뜻 있게
// 지키는 것 (E2E가 기대하는 값):
// - 오늘(daysAgo 0)에는 넣지 않는다: 여러 E2E가 "오늘 가계부 2건 · -16,800원"을 본다
// - 제목 "점심"(식비)·"아메리카노"·"동네 로스터리"와 메모 "원두"는 쓰지 않는다: E2E가 그 이름으로 하나만 찾는다

type MoreTemplate = {
  daysAgo: number;
  record: DistributiveOmit<NewRecordInput, 'occurredAt'>;
};

type Extra = { memo?: string; tags?: string[] };

function expense(
  daysAgo: number,
  title: string,
  amount: number,
  category: string,
  paymentMethod: string,
  { memo, tags = [] }: Extra = {},
): MoreTemplate {
  return {
    daysAgo,
    record: {
      type: 'expense',
      title,
      memo: memo ?? null,
      tags,
      fields: { amount, category, paymentMethod },
    },
  };
}

function review(
  daysAgo: number,
  title: string,
  rating: number,
  targetKind: '장소' | '제품' | '콘텐츠' | '경험',
  { memo, tags = [] }: Extra = {},
): MoreTemplate {
  return {
    daysAgo,
    record: {
      type: 'review',
      title,
      memo: memo ?? null,
      tags,
      fields: { rating, targetKind },
    },
  };
}

// 운동은 제목 칸이 없어 종목 이름이 제목이 된다 (sampleRecords.ts와 같은 규칙)
function workout(
  daysAgo: number,
  activity: string,
  minutes: number,
  distance: number | null,
  { memo, tags = [] }: Extra = {},
): MoreTemplate {
  return {
    daysAgo,
    record: {
      type: 'workout',
      title: activity,
      memo: memo ?? null,
      tags,
      fields:
        distance === null
          ? { activity, minutes }
          : { activity, minutes, distance },
    },
  };
}

function weight(daysAgo: number, value: number): MoreTemplate {
  return {
    daysAgo,
    record: {
      type: 'body',
      title: '체중',
      memo: null,
      tags: [],
      fields: { weight: value },
    },
  };
}

function waist(daysAgo: number, value: number): MoreTemplate {
  return {
    daysAgo,
    record: {
      type: 'body',
      title: '허리둘레',
      memo: null,
      tags: [],
      fields: { waist: value },
    },
  };
}

export const MORE_SAMPLE_TEMPLATES: readonly MoreTemplate[] = [
  // ── 가계부 31 ──
  expense(1, '김밥 한 줄', 3500, '식비', '현금'),
  expense(2, '팀 점심 회식', 46000, '식비', '카드', {
    memo: '부장님이 반 냈다',
    tags: ['회사'],
  }),
  expense(2, '지하철', 1450, '교통', '간편결제'),
  expense(3, '라떼', 5200, '카페', '간편결제', {
    memo: '노트북 들고 세 시간 작업',
    tags: ['혼자'],
  }),
  expense(5, '유튜브 프리미엄', 14900, '구독', '카드', { tags: ['구독'] }),
  expense(5, '세탁소', 12000, '생활', '현금'),
  expense(6, '영화 관람', 15000, '문화', '카드', {
    memo: '팝콘은 참았다',
    tags: ['데이트'],
  }),
  expense(7, '배달 치킨', 24000, '식비', '간편결제', {
    memo: '오랜만에 반반',
    tags: ['주말', '야식'],
  }),
  expense(8, '주유', 68000, '교통', '카드'),
  expense(9, '전시회 티켓', 18000, '문화', '카드', { tags: ['주말'] }),
  expense(9, '샐러드', 9900, '식비', '카드', { tags: ['회사'] }),
  expense(10, '치과 스케일링', 18000, '의료', '카드', {
    memo: '1년에 한 번은 꼭',
  }),
  expense(11, '친구 결혼식 축의금', 100000, '경조사', '계좌이체', {
    tags: ['친구'],
  }),
  expense(12, '다이소', 8500, '생활', '현금'),
  expense(14, '부모님 선물', 120000, '쇼핑', '카드', {
    memo: '안마기. 생각보다 좋아하셨다',
    tags: ['가족'],
  }),
  expense(15, '동네 빵', 7800, '식비', '현금', { tags: ['주말'] }),
  expense(16, '전자책 구독', 9900, '구독', '카드', { tags: ['구독'] }),
  // 한 건이 달 지출의 1/3을 차지하면 분류별 막대가 그 하나로 쏠려 보여 평범한 금액으로 둔다
  expense(17, '헬스장 3개월 등록', 180000, '운동', '카드', {
    memo: '이번엔 꼭 다 다닌다',
  }),
  expense(18, '마트 장보기', 51200, '생활', '카드', { tags: ['마트'] }),
  expense(19, '고속버스', 23800, '교통', '카드', { tags: ['여행'] }),
  expense(20, '게스트하우스', 55000, '여행', '계좌이체', { tags: ['여행'] }),
  expense(20, '시장 국밥', 9000, '식비', '현금', {
    memo: '숙소 사장님 추천집',
    tags: ['여행'],
  }),
  expense(21, '기념품', 16000, '쇼핑', '현금', { tags: ['여행'] }),
  expense(23, '책 두 권', 31000, '문화', '카드'),
  expense(25, '감기약', 7200, '의료', '현금'),
  expense(27, '저녁거리', 23500, '생활', '간편결제'),
  expense(29, '브런치', 32000, '식비', '카드', { tags: ['친구', '주말'] }),
  expense(31, '겨울 이불', 79000, '생활', '카드'),
  expense(34, '콘서트 예매', 132000, '문화', '카드', {
    memo: '두 달 뒤 공연. 자리는 2층',
    tags: ['데이트'],
  }),
  expense(37, '안경 렌즈 교체', 89000, '의료', '카드'),
  expense(40, '케이크 한 조각', 12500, '카페', '카드', { tags: ['친구'] }),

  // ── 후기 12 (별점 1~5 모두) ──
  review(2, '성수 팝업스토어', 3, '경험', {
    memo: '줄이 너무 길었다. 굿즈는 귀여움',
    tags: ['주말'],
  }),
  review(5, '회사 앞 국수집', 4, '장소', {
    memo: '비빔국수가 맛있다. 점심시간엔 줄을 선다',
    tags: ['회사', '재방문'],
  }),
  review(6, '극장판 애니메이션', 5, '콘텐츠', {
    memo: '마지막 장면에서 울었다',
    tags: ['데이트'],
  }),
  review(9, '사진 전시회', 4, '경험', { tags: ['주말'] }),
  review(13, '무선 키보드', 2, '제품', {
    memo: '타건감은 좋은데 연결이 자꾸 끊긴다',
  }),
  review(17, '오마카세', 5, '장소', {
    memo: '가격은 세지만 기념일이라면',
    tags: ['기념일'],
  }),
  review(20, '바닷가 게스트하우스', 4, '장소', {
    memo: '창문 너머로 바다가 보인다. 방음은 아쉬움',
    tags: ['여행'],
  }),
  review(21, '해 뜰 무렵 해변 산책', 5, '경험', { tags: ['여행'] }),
  review(24, '자기계발서', 2, '콘텐츠', {
    memo: '한 줄 요약이면 충분했다',
  }),
  review(28, '전기 포트', 4, '제품'),
  review(33, '수제버거 가게', 1, '장소', {
    memo: '패티가 식어서 나왔다. 다시 갈 일은 없을 듯',
  }),
  review(38, '타입스크립트 온라인 강의', 4, '콘텐츠', { tags: ['공부'] }),

  // ── 운동 12 ──
  workout(1, '헬스', 50, null, { memo: '벤치 40kg 5세트', tags: ['상체'] }),
  workout(2, '러닝', 35, 6.1),
  workout(5, '클라이밍', 90, null, {
    memo: '초록 문제 처음 완등',
    tags: ['친구'],
  }),
  workout(8, '수영', 45, 1.2),
  workout(9, '요가', 30, null),
  workout(12, '자전거', 80, 21.5, { tags: ['주말'] }),
  workout(15, '헬스', 60, null, { tags: ['하체'] }),
  workout(18, '등산', 150, 7.8, { memo: '정상에서 컵라면' }),
  workout(21, '걷기', 50, 4.2, { tags: ['여행'] }),
  workout(26, '러닝', 40, 7.0, { memo: '처음으로 7km를 쉬지 않고' }),
  workout(32, '배드민턴', 60, null, { tags: ['회사'] }),
  workout(39, '수영', 40, 1.0),

  // ── 체형 9: 6주 동안 체중이 조금씩 내려간다 (기본 예시의 최근 2주 68.4~69.3으로 이어진다) ──
  weight(14, 69.4),
  weight(17, 69.4),
  weight(21, 69.6),
  weight(24, 69.5),
  weight(28, 69.7),
  weight(35, 69.8),
  weight(41, 69.9),
  waist(17, 79.8),
  waist(31, 80.5),
];
