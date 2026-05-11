import { useSelectBox } from "@select-box/react";

import { SelectBoxCombobox } from "./select-box-combobox.js";

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
    const { state, controller } = useSelectBox<Fruit>({
        options: fruits,
        ungroupedLabel: "Citrus",
    });

    return (
        <main className="page">
            <header>
                <h1>select-box</h1>
                <p className="subtitle">React example · M1 single-select with option groups</p>
            </header>

            <section className="demo">
                <label className="field-label">Pick a fruit</label>
                <SelectBoxCombobox state={state} controller={controller} placeholder="Search fruits…" />

                <dl className="snapshot">
                    <dt>Selected value</dt>
                    <dd>
                        <code>{state.value ? JSON.stringify(state.value) : "null"}</code>
                    </dd>
                    <dt>Open</dt>
                    <dd>{state.open ? "true" : "false"}</dd>
                    <dt>Query</dt>
                    <dd>
                        <code>{state.query || "—"}</code>
                    </dd>
                    <dt>Active index</dt>
                    <dd>{state.activeIndex}</dd>
                    <dt>Filtered groups</dt>
                    <dd>{state.filteredGroups.map((group) => group.label).join(", ") || "—"}</dd>
                </dl>
            </section>
        </main>
    );
}
