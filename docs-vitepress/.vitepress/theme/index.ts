import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";

import FrameworkExample from "./FrameworkExample.vue";

const theme: Theme = {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component("FrameworkExample", FrameworkExample);
    },
};

export default theme;
