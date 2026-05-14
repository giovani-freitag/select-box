import type { SingleSelectBoxControllerConfig } from "../types.js";
import { SelectBoxController } from "./select-box-controller.js";

/**
 * Single-selection sugar over the unified `SelectBoxController`. Preset to
 * `mode: "single"`; the value type is `string | null` (the picked option's
 * key, or `null` when nothing is selected).
 */
export class SingleSelectBoxController<TExtra extends object = object>
    extends SelectBoxController<TExtra, string | null> {
    constructor(config: SingleSelectBoxControllerConfig<TExtra>) {
        super({ ...config, mode: "single" });
    }
}
