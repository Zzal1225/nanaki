type EditButtonProps = {
  label: string;
  // 화면에 보이는 "수정"만으로는 무엇을 고치는지 모른다 (전체 예산 / 분류별 예산). 화면 읽기 프로그램에는 대상까지
  accessibleLabel: string;
  disabled: boolean;
  onClick: () => void;
};

// 카드 머리의 글자 버튼 (시안 18 "수정"·"편집"). 글자는 작아도 누르는 자리는 44px.
// 오프라인이면 숨기지 않고 비활성으로 둔다: 사라지면 "고칠 수 없는 화면"인지 "잠깐 못 고치는지" 알 수 없다 (안내 문구는 화면 위에)
export default function EditButton({
  label,
  accessibleLabel,
  disabled,
  onClick,
}: EditButtonProps) {
  return (
    <button
      type='button'
      aria-label={accessibleLabel}
      disabled={disabled}
      onClick={onClick}
      className='-my-3 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-body-sm font-semibold text-accent enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed disabled:text-fg-disabled'
    >
      {label}
    </button>
  );
}
