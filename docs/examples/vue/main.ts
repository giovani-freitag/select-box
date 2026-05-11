import { createApp } from "vue";

import App from "./App.vue";
import { wireExampleTheme } from "./theme.js";

wireExampleTheme();

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Root element #app not found");

createApp(App).mount(rootElement);
