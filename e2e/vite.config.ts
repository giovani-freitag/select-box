import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
    root: import.meta.dirname,
    plugins: [react(), vue()],
    server: {
        port: 4330,
        strictPort: true,
    },
});
