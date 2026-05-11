import { wireExampleTheme } from "./theme.js";
import { FruitPicker } from "./fruit-picker.js";

wireExampleTheme();

if (!customElements.get("fruit-picker")) {
    customElements.define("fruit-picker", FruitPicker);
}

const element = document.getElementById("fruit") as FruitPicker;
const committed = document.getElementById("committed")!;

element.addEventListener("change", (event) => {
    const value = (event.target as FruitPicker).value;
    committed.textContent = value ? JSON.stringify(value) : "null";
});
