import {
    AbstractAddon,
    type AddonKeyOutcome,
    type AddonTransformContext,
} from "@select-box/core";

/**
 * Config for {@link RestoreOnBackspaceAddon}.
 */
export interface RestoreOnBackspaceAddonConfig {
    /**
     * `"query"` (default) puts the removed option's label back in the search
     * box, so a mistyped pick can be corrected in place. `"remove"` only drops
     * the selection, matching a plain tag input.
     */
    readonly restoreAs?: "query" | "remove";
    /** Key that triggers it. Defaults to `"Backspace"`. */
    readonly key?: string;
}

/**
 * Public shape published under `snapshot.addons["restore-on-backspace"]`.
 */
export interface RestoreOnBackspaceSnapshot {
    /** The option the next Backspace would pop, or `null` when it would do nothing. */
    readonly nextToRestore: string | null;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        "restore-on-backspace": RestoreOnBackspaceSnapshot;
    }
}

/**
 * Selectize parity: Backspace on an empty query pops the last selection back
 * into the search box as editable text.
 *
 * Only fires while the query is empty, so it never eats a Backspace the user
 * meant for the text they are typing.
 */
export class RestoreOnBackspaceAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "restore-on-backspace";

    private readonly restoreAs: "query" | "remove";
    private readonly key: string;

    constructor(config: RestoreOnBackspaceAddonConfig = {}) {
        super();
        this.restoreAs = config.restoreAs ?? "query";
        this.key = config.key ?? "Backspace";
    }

    onKeyDown(
        key: string,
        context: AddonTransformContext<TExtra>,
    ): AddonKeyOutcome<TExtra> {
        if (key !== this.key) return "pass";
        const target = this.restorable(context);
        if (target === null) return "pass";
        // Multi toggles the option off; single has to be emptied, because
        // committing the selected option there replaces it with itself.
        const drop =
            context.mode === "multi" ? { commitOption: target } : { clear: true };
        return this.restoreAs === "query" ? { ...drop, query: target.label } : drop;
    }

    extendSnapshot(context: {
        readonly snapshot: {
            readonly query: string;
            readonly selectedOptions: ReadonlyArray<{ readonly label: string }>;
        };
    }): RestoreOnBackspaceSnapshot {
        const { snapshot } = context;
        const last = snapshot.selectedOptions.at(-1);
        return {
            nextToRestore:
                snapshot.query === "" && last !== undefined ? last.label : null,
        };
    }

    private restorable(
        context: AddonTransformContext<TExtra>,
    ): AddonTransformContext<TExtra>["selectedOptions"][number] | null {
        // A non-empty query means the user is editing text; Backspace belongs to
        // the text, not to the selection.
        if (context.query !== "") return null;
        return context.selectedOptions.at(-1) ?? null;
    }
}
