import react from "@vitejs/plugin-react";
import { defineConfig } from "vitepress";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { serveExamples } from "./plugin-serve-examples.js";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
    title: "select-box",
    description: "Framework-agnostic combobox/select-box library — core + per-framework wrappers.",
    cleanUrls: true,
    vue: {
        template: {
            compilerOptions: {
                isCustomElement: (tag) => tag.includes("-"),
            },
        },
    },
    vite: {
        plugins: [
            serveExamples({ docsRoot }),
            react({ include: /\/examples\/.*\.(jsx|tsx)$/ }),
        ],
        build: {
            rollupOptions: {
                input: {
                    jqueryExample: resolve(docsRoot, "examples/jquery/index.html"),
                    litExample: resolve(docsRoot, "examples/lit/index.html"),
                    reactExample: resolve(docsRoot, "examples/react/index.html"),
                    vueExample: resolve(docsRoot, "examples/vue/index.html"),
                    webcomponentsExample: resolve(docsRoot, "examples/webcomponents/index.html"),
                },
            },
        },
    },
    themeConfig: {
        nav: [
            { text: "Guide", link: "/guide/getting-started" },
            { text: "Components", link: "/components/combobox" },
            { text: "API", link: "/api/" },
        ],
        sidebar: {
            "/guide/": [
                {
                    text: "Guide",
                    items: [
                        { text: "Getting started", link: "/guide/getting-started" },
                        { text: "Headless vs ready", link: "/guide/headless-vs-ready" },
                    ],
                },
            ],
            "/components/": [
                {
                    text: "Components",
                    items: [{ text: "Combobox", link: "/components/combobox" }],
                },
            ],
            "/api/": [
                {
                    text: "API reference",
                    items: [{ text: "Index", link: "/api/" }],
                },
            ],
        },
        socialLinks: [],
        outline: "deep",
    },
});
