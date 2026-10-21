'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addSampleRecords } from '@/features/records/sample/addSampleRecords';
import Button from '@/shared/ui/Button';
import GoogleSignInButton from './GoogleSignInButton';
import { signInAsGuest, signInWithGoogle } from './authActions';

type SignInMethod = 'google' | 'guest';

const HOME_PATH = '/';
const SIGN_IN_ERROR_MESSAGE =
  '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';

// 'use client'인 이유: 버튼 클릭 이벤트와 "어떤 로그인이 진행 중인지" 같은 상태가 필요하다
export default function SignInButtons() {
  const router = useRouter();

  const [pendingMethod, setPendingMethod] = useState<SignInMethod | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGoogleClick() {
    setPendingMethod('google');
    setErrorMessage(null);

    const error = await signInWithGoogle();
    // 성공하면 구글 화면으로 떠나므로 여기서는 실패만 처리한다
    if (error) {
      setErrorMessage(SIGN_IN_ERROR_MESSAGE);
      setPendingMethod(null);
    }
  }

  async function handleGuestClick() {
    setPendingMethod('guest');
    setErrorMessage(null);

    const error = await signInAsGuest();
    if (error) {
      setErrorMessage(SIGN_IN_ERROR_MESSAGE);
      setPendingMethod(null);
      return;
    }

    // 빈 화면 대신 바로 둘러볼 수 있게 예시 기록을 넣고 들어간다. 홈이 기록을 불러오기 전에 끝나야
    // 처음부터 채워진 캘린더가 보여서 기다린다 (요청 한 번). 실패해도 체험은 시작한다
    await addSampleRecords();

    // 체험하기는 페이지를 떠나지 않으므로 직접 홈으로 보낸다.
    // push가 아니라 replace라서 뒤로 가기를 눌러도 로그인 화면으로 돌아오지 않는다
    router.replace(HOME_PATH);
  }

  // 하나가 진행 중이면 두 버튼 모두 막아서 두 번 로그인하지 않게 한다
  const isBusy = pendingMethod !== null;

  return (
    <div className='flex flex-col gap-3'>
      <GoogleSignInButton
        onClick={handleGoogleClick}
        disabled={isBusy}
        aria-busy={pendingMethod === 'google'}
      />
      <Button
        variant='secondary'
        className='h-12 w-full'
        onClick={handleGuestClick}
        isLoading={pendingMethod === 'guest'}
        disabled={isBusy && pendingMethod !== 'guest'}
      >
        로그인 없이 체험하기
      </Button>
      {/* role="alert": 에러 문구가 나타나면 스크린 리더가 바로 읽어 준다 */}
      {errorMessage && (
        <p role='alert' className='text-center text-caption text-danger'>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
