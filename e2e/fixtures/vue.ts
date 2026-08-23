import "@select-box/styles/select-box.css";
import { createApp, type Component } from "vue";

import App from "./App.vue";
import { wireControls } from "./config.js";

const app = createApp(App as Component);
const instance = app.mount("#mount") as unknown as { toggleSurface: () => void };

wireControls({
    destroy: () => app.unmount(),
    toggleSurface: () => instance.toggleSurface(),
});
