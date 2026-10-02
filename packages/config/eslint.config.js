import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', '.next/**', 'drizzle/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
)
