import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node22',
  clean: true,
  // The contract package ships TypeScript source, so the bundle must include it.
  noExternal: ['@roomsie/contract'],
})
