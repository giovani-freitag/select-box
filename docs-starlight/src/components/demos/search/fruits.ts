import type { SelectOption } from "@select-box/core";

export interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

export type Fruit = SelectOption<FruitExtra>;

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
