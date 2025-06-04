import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';

// 사용자 프로필 인터페이스
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: 'email' | 'google';
  createdAt: any;
  updatedAt: any;
  settings: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    weekStartsOn: 0 | 1; // 0: 일요일, 1: 월요일
  };
}

// 사용자 프로필 생성/업데이트
export const createOrUpdateUserProfile = async (
  user: User,
  provider: 'email' | 'google'
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData: Partial<UserProfile> = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider,
      updatedAt: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      // 새 사용자 - 기본 설정과 함께 생성
      const newUserData: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
        createdAt: any;
        updatedAt: any;
      } = {
        ...(userData as UserProfile),
        createdAt: serverTimestamp(),
        settings: {
          theme: 'auto',
          notifications: true,
          weekStartsOn: 1, // 월요일 시작
        },
      };

      await setDoc(userRef, newUserData);
      console.log('새 사용자 프로필 생성됨:', user.email);
    } else {
      // 기존 사용자 - 정보만 업데이트
      await setDoc(userRef, userData, { merge: true });
      console.log('사용자 프로필 업데이트됨:', user.email);
    }
  } catch (error) {
    console.error('사용자 프로필 저장 오류:', error);
    throw error;
  }
};

// 사용자 프로필 조회
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('사용자 프로필 조회 오류:', error);
    throw error;
  }
};
