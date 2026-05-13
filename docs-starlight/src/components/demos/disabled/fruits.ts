import type { SelectOption } from "@select-box/core";

export interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

export type Fruit = SelectOption<FruitExtra>;

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
