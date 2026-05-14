import type { SelectionValue } from "../types.js";
import type { SelectBoxController } from "./select-box-controller.js";

/**
 * Outcome reported by `SelectBoxKeyDispatcher.dispatch`. `"handled"` means the
 * controller consumed the key — the caller should typically `preventDefault()`
 * on the underlying DOM event. `"pass"` means the controller ignored it and
 * the caller should let the platform handle it normally.
 */
export type DispatchKeyOutcome = "handled" | "pass";

/**
 * Maps `KeyboardEvent.key` values to controller actions following the WAI-ARIA
 * combobox keyboard pattern. Construct one per controller (or per wrapper
 * instance) and call `dispatch(key)` from the keydown handler; the dispatcher
 * holds only the controller reference, no other state.
 *
 * Shared by every wrapper so keyboard behavior stays identical across React,
 * Vue, Lit, Web Components, and jQuery — the only mode-specific difference
 * (toggle vs replace on commit) is already handled inside the controller's
 * driver.
 */
export class SelectBoxKeyDispatcher<
    TExtra extends object = object,
    TValue extends SelectionValue = SelectionValue,
> {
    private readonly controller: SelectBoxController<TExtra, TValue>;

    constructor(controller: SelectBoxController<TExtra, TValue>) {
        this.controller = controller;
    }

    /**
     * Routes one keypress to the controller. Returns `"handled"` when the
     * controller consumed the key — the caller should `preventDefault()`.
     */
    dispatch(key: string): DispatchKeyOutcome {
        const state = this.controller.getState();
        switch (key) {
            case "ArrowDown":
                if (state.open) this.controller.moveActive(1);
                else this.controller.open();
                return "handled";
            case "ArrowUp":
                if (state.open) this.controller.moveActive(-1);
                else this.controller.open();
                return "handled";
            case "Enter":
                if (state.open) this.controller.commitActive();
                else this.controller.open();
                return "handled";
            case "Escape":
                if (!state.open) return "pass";
                this.controller.close();
                return "handled";
            default:
                return "pass";
        }
    }
}
