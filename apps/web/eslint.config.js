// @ts-check
/**
 * ESLint flat config（前端）。
 *
 * ESLint 9 原生 flat config（无需 ESLINT_USE_FLAT_CONFIG 环境变量）。
 * 不依赖 @eslint/js 包（避免 workspace 下 ESM 解析问题），直接以
 * @typescript-eslint recommended 规则集为基础，叠加 react / react-hooks。
 */
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  // 全局忽略
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.ts', '*.config.js'],
  },

  // TS + TSX 源文件
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // 基础质量规则（等价 @eslint/js recommended 的关键项）
      'no-unused-vars': 'off', // 交给 @typescript-eslint/no-unused-vars
      // TS 文件的未声明变量由 tsc 检查；no-undef 不识别 TS lib 全局类型（RequestInit/HTMLElement 等）
      'no-undef': 'off',
      'no-cond-assign': 'error',
      'no-constant-condition': 'warn',
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-empty': 'warn',
      'no-extra-semi': 'error',
      'no-irregular-whitespace': 'error',
      'no-redeclare': 'off', // 交给 @typescript-eslint
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // React
      'react/react-in-jsx-scope': 'off', // react-jsx 不需手动 import React
      'react/prop-types': 'off',
      'react/jsx-key': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
