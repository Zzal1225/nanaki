import { useEffect, useRef } from 'react';

// 기기 안 파일의 미리보기 주소(blob:)를 만들고 닫는다 (쓰기 화면 사진 칸, 맞춰 자르기 창).
// 닫지 않으면 화면을 떠나도 파일이 메모리에 붙잡혀 있다 → 바꾸기·빼기 때 revoke, 화면을 떠날 때 남은 것을 모두 닫는다.
// 만든 주소를 담는 Set은 처음 한 번 만든 객체를 계속 쓴다: 정리(cleanup)가 그 객체를 붙잡아 두면 마지막 내용을 읽을 수 있다
// (ref.current를 정리 함수에서 읽으면 lint가 "이미 바뀌었을 수 있다"고 경고한다)
export function useObjectUrls() {
  const urlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  // 이벤트 처리 중에만 부른다 (그리는 중에 만들면 다시 그릴 때마다 주소가 새로 생긴다)
  function create(file: Blob): string {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return url;
  }

  function revoke(url: string | undefined) {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }

  return { create, revoke };
}
