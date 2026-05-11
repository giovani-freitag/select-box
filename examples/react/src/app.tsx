import { SelectBox } from "@select-box/react";
import { useState } from "react";

interface Fruit {
    readonly id: number;
    readonly name: string;
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
] as const;

export function App() {
    const [committedValue, setCommittedValue] = useState<Fruit | null>(null);

    return (
        <main className="page">
            <header>
                <h1>select-box</h1>
                <p className="subtitle">React example · ready-to-use &lt;SelectBox /&gt;</p>
            </header>

            <section className="demo">
                <label className="field-label">Pick a fruit</label>
                <SelectBox<Fruit>
                    options={fruits}
                    ungroupedLabel="Citrus"
                    placeholder="Search fruits…"
                    onValueChange={setCommittedValue}
                />

                <dl className="snapshot">
                    <dt>Last committed value</dt>
                    <dd>
                        <code>{committedValue ? JSON.stringify(committedValue) : "null"}</code>
                    </dd>
                </dl>
            </section>
        </main>
    );
}
