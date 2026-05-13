import type { SelectOption } from "@select-box/core";

export interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

export type Fruit = SelectOption<FruitExtra>;

export type Scenario = "simple" | "grouped" | "disabled" | "search" | "large-list";

/** Flat list with no groups — the minimum happy path. */
export const simpleFruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", id: 1, name: "apple" },
    { value: "pear", label: "Pear", id: 2, name: "pear" },
    { value: "grape", label: "Grape", id: 3, name: "grape" },
    { value: "lemon", label: "Lemon", id: 4, name: "lemon" },
    { value: "peach", label: "Peach", id: 5, name: "peach" },
];

/** Grouped via `group?: string`; exercises the snapshot's `filteredGroups`. */
export const groupedFruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "quince", label: "Quince", group: "Pomes", id: 3, name: "quince" },
    { value: "peach", label: "Peach", group: "Stone fruits", id: 4, name: "peach" },
    { value: "plum", label: "Plum", group: "Stone fruits", id: 5, name: "plum" },
    { value: "cherry", label: "Cherry", group: "Stone fruits", id: 6, name: "cherry" },
    { value: "lemon", label: "Lemon", id: 7, name: "lemon" },
    { value: "orange", label: "Orange", id: 8, name: "orange" },
    { value: "lime", label: "Lime", id: 9, name: "lime" },
];

/**
 * Disabled options + a fully-disabled group so keyboard nav and pointer-skip
 * behavior are visible side by side.
 */
export const disabledFruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", group: "In stock", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "In stock", id: 2, name: "pear" },
    { value: "grape", label: "Grape", group: "In stock", disabled: true, id: 3, name: "grape" },
    { value: "peach", label: "Peach", group: "In stock", id: 4, name: "peach" },
    { value: "plum", label: "Plum", group: "Out of season", disabled: true, id: 5, name: "plum" },
    { value: "cherry", label: "Cherry", group: "Out of season", disabled: true, id: 6, name: "cherry" },
    { value: "quince", label: "Quince", group: "Out of season", disabled: true, id: 7, name: "quince" },
    { value: "lemon", label: "Lemon", id: 8, name: "lemon" },
    { value: "orange", label: "Orange", disabled: true, id: 9, name: "orange" },
    { value: "lime", label: "Lime", id: 10, name: "lime" },
];

/** Wider dataset so substring vs fuzzy differences are visible while typing. */
export const searchableFruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "quince", label: "Quince", group: "Pomes", id: 3, name: "quince" },
    { value: "loquat", label: "Loquat", group: "Pomes", id: 4, name: "loquat" },
    { value: "peach", label: "Peach", group: "Stone fruits", id: 5, name: "peach" },
    { value: "plum", label: "Plum", group: "Stone fruits", id: 6, name: "plum" },
    { value: "cherry", label: "Cherry", group: "Stone fruits", id: 7, name: "cherry" },
    { value: "apricot", label: "Apricot", group: "Stone fruits", id: 8, name: "apricot" },
    { value: "mango", label: "Mango", group: "Stone fruits", id: 9, name: "mango" },
    { value: "nectarine", label: "Nectarine", group: "Stone fruits", id: 10, name: "nectarine" },
    { value: "lemon", label: "Lemon", group: "Citrus", id: 11, name: "lemon" },
    { value: "lime", label: "Lime", group: "Citrus", id: 12, name: "lime" },
    { value: "orange", label: "Orange", group: "Citrus", id: 13, name: "orange" },
    { value: "grapefruit", label: "Grapefruit", group: "Citrus", id: 14, name: "grapefruit" },
    { value: "kumquat", label: "Kumquat", group: "Citrus", id: 15, name: "kumquat" },
    { value: "tangerine", label: "Tangerine", group: "Citrus", id: 16, name: "tangerine" },
    { value: "blueberry", label: "Blueberry", group: "Berries", id: 17, name: "blueberry" },
    { value: "raspberry", label: "Raspberry", group: "Berries", id: 18, name: "raspberry" },
    { value: "blackberry", label: "Blackberry", group: "Berries", id: 19, name: "blackberry" },
    { value: "strawberry", label: "Strawberry", group: "Berries", id: 20, name: "strawberry" },
    { value: "cranberry", label: "Cranberry", group: "Berries", id: 21, name: "cranberry" },
    { value: "elderberry", label: "Elderberry", group: "Berries", id: 22, name: "elderberry" },
    { value: "banana", label: "Banana", group: "Tropical", id: 23, name: "banana" },
    { value: "pineapple", label: "Pineapple", group: "Tropical", id: 24, name: "pineapple" },
    { value: "papaya", label: "Papaya", group: "Tropical", id: 25, name: "papaya" },
    { value: "guava", label: "Guava", group: "Tropical", id: 26, name: "guava" },
    { value: "passionfruit", label: "Passion fruit", group: "Tropical", id: 27, name: "passionfruit" },
    { value: "dragonfruit", label: "Dragon fruit", group: "Tropical", id: 28, name: "dragonfruit" },
    { value: "watermelon", label: "Watermelon", group: "Melons", id: 29, name: "watermelon" },
    { value: "cantaloupe", label: "Cantaloupe", group: "Melons", id: 30, name: "cantaloupe" },
    { value: "honeydew", label: "Honeydew", group: "Melons", id: 31, name: "honeydew" },
];

/** Legacy alias — keep until every consumer migrates to the scenario-specific arrays. */
export const fruits: ReadonlyArray<Fruit> = groupedFruits;

/** Picks the right dataset for a given scenario; `large-list` is generated dynamically by the page. */
export function getFruitsForScenario(scenario: Scenario): ReadonlyArray<Fruit> {
    switch (scenario) {
        case "simple":
            return simpleFruits;
        case "grouped":
            return groupedFruits;
        case "disabled":
            return disabledFruits;
        case "search":
            return searchableFruits;
        case "large-list":
            return [];
    }
}

/**
 * Only scenarios that mix grouped + ungrouped options need a label for the
 * ungrouped bucket; flat datasets render cleaner without a synthetic header.
 */
export function getUngroupedLabelForScenario(scenario: Scenario): string | undefined {
    return scenario === "grouped" || scenario === "disabled" ? "Citrus" : undefined;
}
