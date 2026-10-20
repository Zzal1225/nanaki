// 나키 메뉴 옆 "AI" 뱃지. 스크린 리더는 "나키 AI"로 읽는다
export default function AiBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-4 items-center rounded-full bg-accent px-1 text-caption font-bold text-accent-foreground ${className}`}
    >
      AI
    </span>
  );
}
