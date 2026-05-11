/**
 * Package entry. M0 ships an empty surface — the M1 `useSelectBox` hook
 * lands once `@select-box/core` exposes its controllers.
 */
import { packageName as corePackageName } from "@select-box/core";

export const packageName = "@select-box/react" as const;
export { corePackageName };
