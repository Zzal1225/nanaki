import Dexie from 'dexie';
import { closeLocalDb } from './localDb';
import { currentLocalDb } from './currentLocalDb';

// 로그아웃·계정 삭제 때 이 기기에 남은 개인 데이터를 지운다 (CLAUDE.md: 로그아웃 시 IndexedDB와 서비스 워커 캐시를 지운다).
// - IndexedDB: 그 계정의 기기 사본(기록·루틴·설정·대기열)
// - 서비스 워커 캐시: 저장해 둔 화면(HTML·화면 조각). 개인 데이터는 들어 있지 않지만, 다음 사람이 이 기기에서
//   로그인 전에 앞 사람의 화면 틀을 보지 않게 함께 지운다
// - 남기는 것: 미리 받은 앱 파일(serwist-precache: JS·CSS·아이콘). 누구의 것도 아니고, 지우면 다음 실행이 느려진다

const PRECACHE_PREFIX = 'serwist-precache';

// 지울 준비: 지금 계정의 사본 이름을 미리 알아 둔다. 로그아웃하면 세션이 없어 어느 계정의 사본인지 알 수 없다.
// 돌려주는 함수를 로그아웃이 성공한 뒤에 부른다 (실패하면 지우지 않아야 보내지 못한 기록이 남는다)
export async function prepareDeviceDataCleanup(): Promise<() => Promise<void>> {
  let databaseName: string | null = null;
  try {
    databaseName = (await currentLocalDb()).name;
  } catch {
    // 세션이 이미 없다(다른 탭에서 로그아웃 등). 화면 캐시만 지운다
  }

  return async () => {
    if (databaseName) {
      // 연결을 닫아야 지울 수 있다 (열린 연결이 있으면 삭제가 그 연결이 닫힐 때까지 기다린다)
      closeLocalDb();
      await Dexie.delete(databaseName);
    }
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !name.startsWith(PRECACHE_PREFIX))
          .map((name) => caches.delete(name)),
      );
    }
  };
}
