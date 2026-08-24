/// <reference types="astro/client" />

/**
 * Starlight's component overrides resolve through a virtual module that only
 * exists inside the Vite pipeline, so `astro check` cannot see it. Declaring the
 * shape here is what lets the docs be type-checked at all — without it every
 * override file reports a missing module and the whole check is unusable.
 */
declare module "virtual:starlight/components/*" {
    const Component: (
        props: Record<string, unknown>,
    ) => unknown;
    export default Component;
}
