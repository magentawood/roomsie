import config from '@roomsie/config/eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'

// Shared config last, so its TypeScript parser wins over Next's.
const eslintConfig = [...nextVitals, ...config]

export default eslintConfig
