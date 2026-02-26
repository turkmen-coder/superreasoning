import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      'dist/**', 'dist-deploy/**', 'dist-prod/**', 'dist2/**',
      'node_modules/**',
      'langextract-main/**', 'semantic-kernel-main/**', 'claude-agent-sdk-python-main/**',
      'zvec-main/**', 'sk-service/**', 'agent/**',
      'archive (4)/**', 'archive (5)/**',
    ],
  }
);
