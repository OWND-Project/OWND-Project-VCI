import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": process.env,
  },
  server: {
    host: true,
    proxy: {
      "/admin": "http://localhost:3000/",
      "/login": "http://localhost:3000/",
      "/vp": "http://localhost:3000/",
      "/vci": "http://localhost:3000/",
    },
  },
  base: "./",
});
