import type { SelectOption } from "@select-box/core";

export interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

export type Fruit = SelectOption<FruitExtra>;

export const simpleFruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", id: 1, name: "apple" },
    { value: "pear", label: "Pear", id: 2, name: "pear" },
    { value: "grape", label: "Grape", id: 3, name: "grape" },
    { value: "lemon", label: "Lemon", id: 4, name: "lemon" },
    { value: "peach", label: "Peach", id: 5, name: "peach" },
];
