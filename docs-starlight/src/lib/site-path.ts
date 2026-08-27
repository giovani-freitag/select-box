/**
 * Resolves a site-root path against the base the site is deployed under.
 *
 * @param path - Site-root path, with or without its leading slash.
 * @returns The same path prefixed with the configured deploy base.
 */
export function withBase(path: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    return `${base}/${path.replace(/^\//, "")}`;
}
