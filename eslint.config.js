import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/', 'node_modules/', 'docs/'],
  },
  {
    rules: {
      // 项目大量使用 any，暂时关闭
      '@typescript-eslint/no-explicit-any': 'off',
      // copy-assets 脚本用了 require
      '@typescript-eslint/no-require-imports': 'off',
      // 未使用变量：warn，忽略 _ 前缀
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
