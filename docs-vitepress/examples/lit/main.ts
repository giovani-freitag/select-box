import { SelectBox } from "@select-box/lit";

import { wireExampleTheme } from "./theme.js";

wireExampleTheme();

interface Fruit {
    readonly id: number;
    readonly name: string;
}

if (!customElements.get("select-box")) {
    customElements.define("select-box", SelectBox);
}

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "quince" }, label: "Quince", group: "Pomes" },
    { value: { id: 4, name: "peach" }, label: "Peach", group: "Stone fruits" },
    { value: { id: 5, name: "plum" }, label: "Plum", group: "Stone fruits" },
    { value: { id: 6, name: "cherry" }, label: "Cherry", group: "Stone fruits", disabled: true },
    { value: { id: 7, name: "lemon" }, label: "Lemon" },
    { value: { id: 8, name: "orange" }, label: "Orange" },
    { value: { id: 9, name: "lime" }, label: "Lime" },
];

const element = document.getElementById("fruit") as SelectBox<Fruit>;
const committed = document.getElementById("committed")!;

element.options = fruits;
element.placeholder = "Search fruits…";
element.ungroupedLabel = "Citrus";

element.addEventListener("change", () => {
    const value = element.value;
    committed.textContent = value ? JSON.stringify(value) : "null";
});
