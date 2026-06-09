import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone practice app. Runs on its own port so it never clashes with
// Aayusha's UI (which uses the default 5173).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
  },
});
