-- created_at 기본값을 now()에서 clock_timestamp()로 바꾼다.
-- now()는 "이 트랜잭션이 시작된 시각"이라, insert 한 번에 여러 줄을 넣으면(체험하기 예시 기록 12개) 모든 줄의 created_at이 똑같다.
-- 목록은 날짜 → 만든 시각 순으로 정렬하는데 둘 다 같으면 DB가 아무 순서로나 돌려줘서, 새로고침할 때마다 같은 날 기록 순서가 바뀌었다
-- (화면 비교 테스트가 실행마다 다른 순서를 찍어 발견).
-- clock_timestamp()는 "그 줄을 실제로 만드는 순간"이라 한 번에 넣어도 넣은 순서대로 시각이 달라진다.
-- 이미 있는 줄의 값은 바꾸지 않는다 (기본값은 새 줄에만 쓰인다)
alter table public.records
alter column created_at set default clock_timestamp();
