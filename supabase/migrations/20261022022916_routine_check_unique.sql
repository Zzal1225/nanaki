-- 루틴 체크(수행 기록)는 "루틴 하나 × 하루 = 기록 한 줄"이다 (2026-10-22 사용자 결정).
-- 같은 루틴을 같은 날 두 번 저장하면(빠르게 두 번 누름, 두 기기에서 동시에) 그날 횟수가 둘로 갈라지고 달성률이 틀어진다.
-- 앱의 "있으면 고치고 없으면 만든다"만으로는 두 요청이 동시에 "없음"을 보고 둘 다 만드는 경우를 막지 못해서 DB가 막는다.
--
-- 부분 고유 색인: 루틴 체크(type = 'routine')이면서 지우지 않은 줄에만 건다.
-- - 다른 타입은 하루에 여러 줄이 정상이라 대상이 아니다
-- - 체크를 풀면 소프트 삭제(deleted_at)라, 지운 줄은 빼야 다시 체크할 때 새 줄을 만들 수 있다
-- routineId는 fields(jsonb) 안에 있어 식 색인((fields ->> 'routineId'))으로 건다
create unique index records_routine_check_unique
on public.records (user_id, (fields ->> 'routineId'), occurred_at)
where type = 'routine' and deleted_at is null;
