/**
 * Applies the initial theme from the `theme` query parameter (set by the
 * docs host when constructing the iframe URL), falls back to the
 * `prefers-color-scheme` media query if absent, and listens for further
 * theme updates posted by the host via `postMessage`.
 */
export function wireExampleTheme(): void {
    applyTheme(detectInitialTheme());
    window.addEventListener("message", handleThemeMessage);
}

type Theme = "light" | "dark";

function detectInitialTheme(): Theme {
    const fromQuery = new URLSearchParams(window.location.search).get("theme");
    if (fromQuery === "light" || fromQuery === "dark") return fromQuery;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset["theme"] = theme;
}

function handleThemeMessage(event: MessageEvent<unknown>): void {
    const payload = event.data;
    if (typeof payload !== "object" || payload === null) return;
    const message = payload as { type?: unknown; value?: unknown };
    if (message.type !== "select-box-theme") return;
    if (message.value !== "light" && message.value !== "dark") return;
    applyTheme(message.value);
}
