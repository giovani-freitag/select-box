import type { SelectBoxAddon } from "../types.js";

/**
 * Base class for addons. Subclasses declare `name` and override any of the
 * optional hooks (`attach`, `detach`, `provideFilter`, `extendSnapshot`) the
 * addon needs. The default lifecycle hooks are no-ops.
 */
export abstract class AbstractAddon<TExtra extends object = object>
    implements SelectBoxAddon<TExtra>
{
    abstract readonly name: string;

    attach(): void {}

    detach(): void {}
}
