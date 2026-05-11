import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";

import FrameworkSwitcher from "./FrameworkSwitcher.vue";

const theme: Theme = {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component("FrameworkSwitcher", FrameworkSwitcher);
    },
};

export default theme;
