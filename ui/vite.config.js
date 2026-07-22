import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Build-time parameters sourced from package.json, so a single edit there flows
// into the built app with no code change. `config.teamsChatUrl` is the Teams
// feedback-chat link; npm also exposes it as npm_package_config_teamsChatUrl
// when scripts run via npm, which takes precedence if set. The chosen value is
// injected as the global __TEAMS_CHAT_URL__ (read in src/config.js).
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)
const teamsChatUrl =
  process.env.npm_package_config_teamsChatUrl ||
  pkg.config?.teamsChatUrl ||
  'https://aka.ms/forthelore'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    __TEAMS_CHAT_URL__: JSON.stringify(teamsChatUrl),
  },
})
