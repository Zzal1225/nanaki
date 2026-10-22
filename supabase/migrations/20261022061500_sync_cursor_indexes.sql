-- 기기 사본 동기화(25b)는 "마지막으로 받은 (updated_at, id) 뒤의 줄"을 순서대로 받는다
-- (where updated_at > t or (updated_at = t and id > i) order by updated_at, id limit 1000).
-- 이 색인이 없으면 화면을 열 때마다 그 계정의 모든 기록을 훑어 정렬한다. 기록이 쌓일수록 느려진다.
-- user_id를 맨 앞에 둔다: RLS가 모든 조회에 user_id = auth.uid()를 붙여서 그 계정의 줄만 바로 찾는다.
-- 지운 줄(deleted_at)도 받아야 하므로(다른 기기에서 지운 사실 전파) 부분 색인으로 거르지 않는다
create index records_user_id_updated_at_id_idx
on public.records (user_id, updated_at, id);

-- 루틴도 같은 방식으로 받는다 (루틴은 지우지 않고 그만두기만 한다)
create index routines_user_id_updated_at_id_idx
on public.routines (user_id, updated_at, id);
