type SwatchProps = {
  name: string;
  // Tailwind는 클래스 이름을 글자 그대로 찾아서 CSS를 만든다. `bg-${name}`처럼 조합하면 못 찾으므로 전체를 받는다
  className: string;
};

export default function Swatch({ name, className }: SwatchProps) {
  return (
    <div className='flex flex-col gap-2'>
      {/* 색 이름은 아래 글자가 전달하므로 상자는 스크린 리더에서 숨긴다 */}
      <div
        aria-hidden='true'
        className={`h-12 rounded-md border border-border ${className}`}
      />
      <span className='text-caption text-fg-secondary'>{name}</span>
    </div>
  );
}
