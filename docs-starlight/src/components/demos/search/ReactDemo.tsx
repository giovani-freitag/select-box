// #region snippet
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "lemon", label: "Lemon" },
    { value: "blueberry", label: "Blueberry" },
    { value: "raspberry", label: "Raspberry" },
    { value: "strawberry", label: "Strawberry" },
    { value: "watermelon", label: "Watermelon" },
];

export default function Demo(): React.ReactElement {
    return (
        <div className="sb-demo">
            <SelectBox options={fruits} placeholder="Search fruits…" />
        </div>
    );
}
// #endregion snippet
