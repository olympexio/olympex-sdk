import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

const jsdocTagNames = {
  definedTags: ['remarks', 'example', 'see', 'property'],
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'src/config/initialize.ts',
      'src/logging/console-logger.ts',
      'src/methods/get-version.ts',
      'src/errors/*-error.ts',
    ],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-tag-names': ['error', jsdocTagNames],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/require-example': 'off',
    },
  },
  {
    files: ['src/types/public.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/check-tag-names': ['error', jsdocTagNames],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'off',
      'jsdoc/require-property': 'off',
      'jsdoc/require-example': 'off',
    },
  },
);
