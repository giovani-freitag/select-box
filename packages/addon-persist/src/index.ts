export { PersistAddon, restoreSelection } from "./persist-addon.js";
export { SelectionStorageService } from "./selection-storage-service.js";
export type {
    PersistAddonConfig,
    PersistSnapshot,
    RestoreSelectionConfig,
} from "./persist-addon.js";
export type {
    KeyValueStorage,
    SelectionStorageServiceConfig,
} from "./selection-storage-service.js";

export const packageName = "@select-box/addon-persist" as const;
