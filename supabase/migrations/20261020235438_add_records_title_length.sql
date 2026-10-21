-- 제목 길이 제한을 DB에도 건다. 앱의 Zod(MAX_TITLE_LENGTH)와 같은 값이어야 한다.
-- 공개 키로 앱을 거치지 않고 API에 바로 insert하면 Zod 검사를 건너뛸 수 있어서, 마지막 방어선은 DB다.
-- Zod는 사용자에게 빠르고 친절한 오류를 보여 주는 역할. 메모(500자)와 같은 규칙으로 맞춘다
alter table public.records
add constraint records_title_length_check check (char_length(title) <= 40);
