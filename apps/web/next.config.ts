import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@roomsie/contract'],
  // The project has one agent file, CONTEXT.md. Next must not write its own.
  agentRules: false,
}

export default config
