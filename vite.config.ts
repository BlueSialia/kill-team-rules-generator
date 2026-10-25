import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this repository below /kill-team-rules-generator/.
  // Local development and other static hosts remain rooted at /.
  base: process.env.GITHUB_ACTIONS ? '/kill-team-rules-generator/' : '/',
});
