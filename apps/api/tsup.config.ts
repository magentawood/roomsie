import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: 'esm',
  target: 'node22',
  clean: true,
  // The workspace packages ship TypeScript source, so the bundle must include them.
  noExternal: ['@roomsie/contract', '@roomsie/config'],
})
