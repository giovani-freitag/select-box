import type { SelectBoxAddon, SelectBoxAddonHost } from "../types.js";

/**
 * Base class for addons. Subclasses declare `name` and override `attach`
 * (call `super.attach(host)` first) to add their own setup; the default
 * `detach` clears the host reference.
 */
export abstract class AbstractAddon<TExtra extends object = object>
    implements SelectBoxAddon<TExtra>
{
    abstract readonly name: string;

    protected host: SelectBoxAddonHost<TExtra> | null = null;

    attach(host: SelectBoxAddonHost<TExtra>): void {
        this.host = host;
    }

    detach(): void {
        this.host = null;
    }
}
