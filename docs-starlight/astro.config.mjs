// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";

export default defineConfig({
    site: "https://select-box.dev",
    integrations: [
        react({ include: ["**/demos/Reac*", "**/components/react/**"] }),
        vue({ include: ["**/demos/Vue*", "**/components/vue/**"] }),
        starlight({
            title: "select-box",
            description:
                "Framework-agnostic select-box. One core, every framework — React, Vue, Lit, Web Components, jQuery.",
            logo: { src: "./src/assets/logo.svg", replacesTitle: false },
            customCss: ["./src/styles/brand.css", "./src/styles/demo.css"],
            social: {
                github: "https://github.com/giovani-freitag/select-box",
            },
            components: {
                Header: "./src/components/starlight/Header.astro",
                ThemeSelect: "./src/components/starlight/ThemeSelect.astro",
                PageFrame: "./src/components/starlight/PageFrame.astro",
                PageTitle: "./src/components/starlight/PageTitle.astro",
                TwoColumnContent: "./src/components/starlight/TwoColumnContent.astro",
            },
            sidebar: [
                {
                    label: "Guide",
                    items: [
                        { label: "Getting started", link: "/guides/getting-started/" },
                        { label: "Headless vs ready", link: "/guides/headless-vs-ready/" },
                    ],
                },
                {
                    label: "Components",
                    items: [{ label: "Select Box", link: "/components/select-box/" }],
                },
                {
                    label: "API reference",
                    autogenerate: { directory: "api" },
                    collapsed: true,
                },
            ],
            expressiveCode: {
                themes: ["github-dark", "github-light"],
                styleOverrides: {
                    borderRadius: "10px",
                    frames: {
                        shadowColor: "transparent",
                    },
                },
            },
        }),
        mdx(),
    ],
});
