import js from '@eslint/js'
import nextCore from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Apply to all relevant files
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      '.git/**',
      'coverage/**',
      'backups/**',
      '*.config.js',
      '*.config.mjs'
    ]
  },
  
  // Base JavaScript rules
  js.configs.recommended,
  
  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn'
    }
  },
  
  // React Hooks rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  
  // Next.js specific rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextCore
    },
    rules: {
      '@next/next/no-img-element': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-css-tags': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-script-component-in-head': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-styled-jsx-in-document': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-unwanted-polyfillio': 'error'
    }
  },
  
  // General rules for all files
  {
    rules: {
      // General code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Code style
      'semi': ['error', 'never'],
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // Import/Export
      'no-duplicate-imports': 'error'
    }
  }
] 