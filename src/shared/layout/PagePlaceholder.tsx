// 아직 만들지 않은 화면의 자리. 해당 기능을 만들 때 지운다
export default function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='flex flex-col gap-2 px-4 py-6 md:px-8'>
      <h1 className='text-title-lg text-fg-primary'>{title}</h1>
      <p className='text-body text-fg-secondary'>{description}</p>
    </div>
  );
}
