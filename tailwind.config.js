/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // nanaki 프로젝트 전용 색상
        positive: {
          50: '#eff6ff',
          500: '#3b82f6', // 파란색 스티커
          600: '#2563eb',
        },
        negative: {
          50: '#fef2f2',
          500: '#ef4444', // 빨간색 스티커
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
