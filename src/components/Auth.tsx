import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createOrUpdateUserProfile } from '../lib/userService';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 사용자 상태 변화 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // 구글 로그인
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Firestore에 사용자 프로필 저장
      await createOrUpdateUserProfile(result.user, 'google');
    } catch (error: any) {
      console.error('구글 로그인 에러:', error);
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          setError('로그인 창이 닫혔습니다. 다시 시도해주세요.');
          break;
        case 'auth/popup-blocked':
          setError(
            '팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.'
          );
          break;
        default:
          setError(`구글 로그인 실패: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Firestore에 사용자 프로필 저장
      await createOrUpdateUserProfile(result.user, 'email');

      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      // Firebase 에러 코드에 따른 한국어 메시지
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('이미 사용 중인 이메일입니다.');
          break;
        case 'auth/weak-password':
          setError('비밀번호가 너무 약합니다. 6자 이상 입력해주세요.');
          break;
        case 'auth/invalid-email':
          setError('올바르지 않은 이메일 형식입니다.');
          break;
        default:
          setError(`회원가입 실패: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Firestore에 사용자 프로필 업데이트
      await createOrUpdateUserProfile(result.user, 'email');

      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('로그인 에러:', error);
      // Firebase 에러 코드에 따른 한국어 메시지
      switch (error.code) {
        case 'auth/invalid-credential':
          setError(
            '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 회원가입을 먼저 해주세요.'
          );
          break;
        case 'auth/user-not-found':
          setError('존재하지 않는 계정입니다. 회원가입을 먼저 해주세요.');
          break;
        case 'auth/wrong-password':
          setError('비밀번호가 올바르지 않습니다.');
          break;
        case 'auth/invalid-email':
          setError('올바르지 않은 이메일 형식입니다.');
          break;
        case 'auth/too-many-requests':
          setError(
            '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
          );
          break;
        default:
          setError(`로그인 실패: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // 로그인된 상태
  if (user) {
    return (
      <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
        <h3 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>
          👋 안녕하세요!
        </h3>

        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium'>
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className='text-gray-900 dark:text-white font-medium'>
                {user.email}
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                로그인 완료
              </p>
            </div>
          </div>

          <div className='pt-4 border-t border-gray-200 dark:border-gray-600'>
            <button
              onClick={handleSignOut}
              className='w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200'
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로그인/회원가입 폼
  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
      <h3 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>
        🔐 {isSignUp ? '회원가입' : '로그인'}
      </h3>

      <form
        onSubmit={isSignUp ? handleSignUp : handleSignIn}
        className='space-y-4'
      >
        {/* 구글 로그인 버튼 */}
        <button
          type='button'
          onClick={handleGoogleSignIn}
          disabled={loading}
          className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50'
        >
          <svg className='w-5 h-5' viewBox='0 0 24 24'>
            <path
              fill='#4285F4'
              d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
            />
            <path
              fill='#34A853'
              d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
            />
            <path
              fill='#FBBC05'
              d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
            />
            <path
              fill='#EA4335'
              d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
            />
          </svg>
          {loading ? '로그인 중...' : 'Google로 로그인'}
        </button>

        {/* 구분선 */}
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-300 dark:border-gray-600'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'>
              또는
            </span>
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            이메일
          </label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
            placeholder='이메일을 입력하세요'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            비밀번호
          </label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
            placeholder='비밀번호를 입력하세요 (6자 이상)'
          />
        </div>

        {error && (
          <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-red-700 dark:text-red-300 text-sm'>{error}</p>
          </div>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200'
        >
          {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
        </button>

        <div className='text-center'>
          <button
            type='button'
            onClick={() => setIsSignUp(!isSignUp)}
            className='text-blue-500 hover:text-blue-600 text-sm font-medium'
          >
            {isSignUp
              ? '이미 계정이 있나요? 로그인'
              : '계정이 없나요? 회원가입'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Auth;
