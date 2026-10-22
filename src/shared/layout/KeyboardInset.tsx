'use client';

// 'use client' 이유: 화면 키보드 높이(visualViewport)와 포커스된 입력칸은 브라우저에서만 안다
import { useEffect } from 'react';
import { computeKeyboardInset, isHiddenByKeyboard } from './keyboardMetrics';

// 아이폰에서 아래쪽 입력칸(메모·태그)을 누르면 키보드에 일부 가렸다 (2026-10-22 사용자 확인).
// 키보드가 올라와도 창 높이는 그대로라, 본문 끝의 칸은 더 위로 올릴 스크롤 공간이 없었다.
// 1) 키보드 높이를 --keyboard-inset에 둔다 → globals.css가 본문 끝에 그만큼 여백을 더해 올릴 공간을 만든다
// 2) 키보드가 다 올라온 뒤(visualViewport resize) 포커스된 칸이 가렸으면 화면 가운데로 스크롤한다
// 키보드가 없는 기기(PC)에서는 높이 차이가 생기지 않아 아무 일도 하지 않는다. 그리는 것은 없다

// 칸 아래로 이만큼은 보이게 (오류 문구 한 줄)
const FIELD_MARGIN_PX = 24;

function isTextField(element: Element | null): element is HTMLElement {
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  return !['checkbox', 'radio', 'button', 'submit', 'date'].includes(
    element.type,
  );
}

export default function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    function update() {
      if (!viewport) return;
      const inset = computeKeyboardInset(
        window.innerHeight,
        viewport.height,
        viewport.scale,
      );
      root.style.setProperty('--keyboard-inset', `${inset}px`);
      if (inset === 0) return;
      const field = document.activeElement;
      if (!isTextField(field)) return;
      const bottom = field.getBoundingClientRect().bottom - viewport.offsetTop;
      if (isHiddenByKeyboard(bottom, viewport.height, FIELD_MARGIN_PX)) {
        field.scrollIntoView({ block: 'center' });
      }
    }

    viewport.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      root.style.removeProperty('--keyboard-inset');
    };
  }, []);

  return null;
}
