import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.vite/'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase uses `!` deliberately for elements it just created.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
)
