import { wireExampleTheme } from "./theme.js";
import { FruitPicker } from "./fruit-picker.js";

wireExampleTheme();

if (!customElements.get("fruit-picker")) {
    customElements.define("fruit-picker", FruitPicker);
}

interface Fruit {
    readonly id: number;
    readonly name: string;
}

const element = document.getElementById("fruit") as FruitPicker;
const committed = document.getElementById("committed")!;

element.addEventListener("valuechange", (event) => {
    const detail = (event as CustomEvent<{ value: Fruit | null }>).detail;
    committed.textContent = detail.value ? JSON.stringify(detail.value) : "null";
});
