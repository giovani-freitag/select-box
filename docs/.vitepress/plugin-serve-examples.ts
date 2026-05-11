import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Plugin } from "vite";

/**
 * VitePress's dev middleware treats any unmatched URL as an SPA route
 * and serves the docs shell — which would swallow our example HTMLs
 * sitting at `docs/examples/<id>/index.html`. This plugin runs `pre`,
 * before VitePress's catch-all, and serves the example HTML through
 * Vite's `transformIndexHtml` pipeline so its module scripts get HMR.
 *
 * Matches `/examples/<...>/index.html` and `/examples/<...>/` (the
 * directory form auto-resolves to `index.html`).
 */
export function serveExamples(options: { docsRoot: string }): Plugin {
    return {
        name: "select-box-docs:serve-examples",
        enforce: "pre",
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const requestUrl = request.url ?? "";
                if (!requestUrl.startsWith("/examples/")) {
                    next();
                    return;
                }

                const [pathOnly] = requestUrl.split("?");
                const candidate = pathOnly!.endsWith("/")
                    ? `${pathOnly}index.html`
                    : pathOnly!;

                if (!candidate.endsWith(".html")) {
                    next();
                    return;
                }

                const filePath = resolve(options.docsRoot, `.${candidate}`);
                if (!existsSync(filePath)) {
                    next();
                    return;
                }

                try {
                    const rawHtml = readFileSync(filePath, "utf-8");
                    const transformed = await server.transformIndexHtml(candidate, rawHtml);
                    response.setHeader("Content-Type", "text/html");
                    response.end(transformed);
                } catch (error) {
                    next(error);
                }
            });
        },
    };
}
