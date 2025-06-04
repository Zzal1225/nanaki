import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';

const FirebaseTest = () => {
  const [firebaseStatus, setFirebaseStatus] = useState({
    auth: false,
    db: false,
    config: false,
  });

  useEffect(() => {
    // Firebase 설정 확인
    const checkFirebaseConfig = () => {
      try {
        // Firebase app이 초기화되었는지 확인
        if (auth && auth.app) {
          setFirebaseStatus((prev) => ({ ...prev, auth: true }));
        }

        if (db && db.app) {
          setFirebaseStatus((prev) => ({ ...prev, db: true }));
        }

        // 환경변수 확인
        const hasConfig = !!(
          import.meta.env.VITE_FIREBASE_API_KEY &&
          import.meta.env.VITE_FIREBASE_PROJECT_ID
        );

        if (hasConfig) {
          setFirebaseStatus((prev) => ({ ...prev, config: true }));
        }
      } catch (error) {
        console.error('Firebase 연결 오류:', error);
      }
    };

    checkFirebaseConfig();
  }, []);

  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
      <h3 className='text-xl font-semibold mb-4 text-gray-900 dark:text-white'>
        🔥 Firebase 연결 상태
      </h3>

      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <span
            className={
              firebaseStatus.config ? 'text-green-500' : 'text-red-500'
            }
          >
            {firebaseStatus.config ? '✅' : '❌'}
          </span>
          <span className='text-gray-700 dark:text-gray-300'>
            환경변수 설정: {firebaseStatus.config ? '완료' : '오류'}
          </span>
        </div>

        <div className='flex items-center gap-3'>
          <span
            className={firebaseStatus.auth ? 'text-green-500' : 'text-red-500'}
          >
            {firebaseStatus.auth ? '✅' : '❌'}
          </span>
          <span className='text-gray-700 dark:text-gray-300'>
            Firebase Auth: {firebaseStatus.auth ? '연결됨' : '연결 실패'}
          </span>
        </div>

        <div className='flex items-center gap-3'>
          <span
            className={firebaseStatus.db ? 'text-green-500' : 'text-red-500'}
          >
            {firebaseStatus.db ? '✅' : '❌'}
          </span>
          <span className='text-gray-700 dark:text-gray-300'>
            Firestore: {firebaseStatus.db ? '연결됨' : '연결 실패'}
          </span>
        </div>
      </div>

      {firebaseStatus.config && firebaseStatus.auth && firebaseStatus.db && (
        <div className='mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
          <p className='text-green-700 dark:text-green-300 text-sm font-medium'>
            🎉 Firebase 연결이 완료되었습니다! 이제 인증 기능을 구현할 수
            있어요.
          </p>
        </div>
      )}

      <div className='mt-4 text-xs text-gray-500 dark:text-gray-400'>
        Project ID:{' '}
        {import.meta.env.VITE_FIREBASE_PROJECT_ID || '설정되지 않음'}
      </div>
    </div>
  );
};

export default FirebaseTest;
