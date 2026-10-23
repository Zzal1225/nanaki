import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 시안 참고용 파일이라 앱 코드가 아니다 (design/README.md)
    'design/**',
  ]),
  // AI 제공자 SDK는 어댑터 파일 하나에서만 (CLAUDE.md). 다른 곳에서 import하면 lint가 막는다:
  // 제공자를 바꿀 때 고칠 곳이 그 파일 하나라는 약속을 말이 아니라 규칙으로 지킨다
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['ai', '@ai-sdk/*'],
              message:
                'AI SDK는 src/features/naki/server/nakiModel.ts에서만 import합니다.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/naki/server/nakiModel.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);

export default eslintConfig;
