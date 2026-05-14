import type { MultiSelectBoxControllerConfig } from "../types.js";
import { SelectBoxController } from "./select-box-controller.js";

/**
 * Multi-selection sugar over the unified `SelectBoxController`. Preset to
 * `mode: "multi"`; the value type is `ReadonlyArray<string>` (the selected
 * option keys, in selection order). Commit toggles instead of replacing.
 */
export class MultiSelectBoxController<TExtra extends object = object>
    extends SelectBoxController<TExtra, ReadonlyArray<string>> {
    constructor(config: MultiSelectBoxControllerConfig<TExtra>) {
        super({ ...config, mode: "multi" });
    }
}
