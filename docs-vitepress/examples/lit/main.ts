import { SelectBox } from "@select-box/lit";

import { wireExampleTheme } from "./theme.js";

wireExampleTheme();

interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

if (!customElements.get("select-box")) {
    customElements.define("select-box", SelectBox);
}

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "quince", label: "Quince", group: "Pomes", id: 3, name: "quince" },
    { value: "peach", label: "Peach", group: "Stone fruits", id: 4, name: "peach" },
    { value: "plum", label: "Plum", group: "Stone fruits", id: 5, name: "plum" },
    { value: "cherry", label: "Cherry", group: "Stone fruits", disabled: true, id: 6, name: "cherry" },
    { value: "lemon", label: "Lemon", id: 7, name: "lemon" },
    { value: "orange", label: "Orange", id: 8, name: "orange" },
    { value: "lime", label: "Lime", id: 9, name: "lime" },
];

const element = document.getElementById("fruit") as SelectBox<FruitExtra>;
const committed = document.getElementById("committed")!;

element.options = fruits;
element.placeholder = "Search fruits…";
element.ungroupedLabel = "Citrus";

element.addEventListener("change", () => {
    const option = element.selectedOption;
    committed.textContent = option ? JSON.stringify(option) : "null";
});
