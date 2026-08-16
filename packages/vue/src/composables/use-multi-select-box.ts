import type { MultiSelectBoxControllerConfig } from "@select-box/core";

import { useSelectBox, type UseSelectBoxResult } from "./use-select-box.js";

export type UseMultiSelectBoxResult<TExtra extends object = object> =
    UseSelectBoxResult<TExtra, ReadonlyArray<string>>;

/**
 * Sugar over `useSelectBox({ mode: "multi" })` — same composable, mode preset.
 * Mirrors how `MultiSelectBoxController` relates to `SelectBoxController`.
 */
export function useMultiSelectBox<TExtra extends object = object>(
    config: MultiSelectBoxControllerConfig<TExtra>,
): UseMultiSelectBoxResult<TExtra> {
    return useSelectBox<TExtra>({ ...config, mode: "multi" });
}
