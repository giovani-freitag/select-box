/// <reference types="astro/client" />

import type { SelectOption } from "@select-box/core";

declare global {
    interface Window {
        /** Populated by LargeListControls.astro when the slider changes. */
        __bigListSeed?: ReadonlyArray<SelectOption>;
    }
}
