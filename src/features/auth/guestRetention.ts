// 체험(익명) 계정을 남겨 두는 기간. DB 예약 작업(supabase/migrations/*_delete_expired_guests.sql)이
// 만든 지 이만큼 지난 체험 계정을 지운다. 둘은 같은 값이어야 한다 (SQL은 이 상수를 읽을 수 없어 따로 적혀 있다)
export const GUEST_RETENTION_DAYS = 3;
