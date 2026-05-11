import { defineConfig } from "vitepress";

export default defineConfig({
    title: "select-box",
    description: "Framework-agnostic combobox/select-box library — core + per-framework wrappers.",
    cleanUrls: true,
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
