import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app.js";
import { wireExampleTheme } from "./theme.js";
import "./styles.css";

wireExampleTheme();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
