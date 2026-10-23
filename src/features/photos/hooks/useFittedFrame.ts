import { useEffect, useRef, useState } from 'react';
import { CROP_ASPECT } from '../photoCrop';

// 3:4 틀 크기: 무대(남은 칸)에 3:4가 꽉 들어가는 가장 큰 크기 (맞춰 자르기 37c1, 카메라 37c2가 같이 쓴다).
// CSS aspect-ratio만으로는 높이·너비 둘 다 제한될 때 비율이 깨져서 직접 잰다. 끌어 옮기기에서 px → 비율 바꾸기에도 이 크기를 쓴다
export function useFittedFrame<T extends HTMLElement>() {
  const stageRef = useRef<T>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const fitted =
        width / height > CROP_ASPECT
          ? { width: height * CROP_ASPECT, height }
          : { width, height: width / CROP_ASPECT };
      setFrame({
        width: Math.floor(fitted.width),
        height: Math.floor(fitted.height),
      });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return { stageRef, frame };
}
