// ESLint 9 flat config + typescript-eslint v8
// 详见 docs/design/01 §六。用 typescript-eslint 单包 + tseslint.config() helper，
// 自动处理 parser 注入与 languageOptions，无需手拼 plugin/parser。
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
)
