// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BottomTabBar from './BottomTabBar';

const location = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));

describe('하단 탭', () => {
  afterEach(() => cleanup());

  it('보기 화면에서는 탭이 있다', () => {
    location.pathname = '/records';
    render(<BottomTabBar />);
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeDefined();
  });

  // 표시(data-tab-bar-hidden)가 있어야 globals.css가 탭 높이 변수를 줄여 저장 버튼이 맨 아래로 내려간다
  it('작성 화면에서는 탭 대신 숨김 표시만 남긴다', () => {
    location.pathname = '/routines/new';
    const { container } = render(<BottomTabBar />);
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).toBeNull();
    expect(container.querySelector('[data-tab-bar-hidden]')).not.toBeNull();
  });
});
