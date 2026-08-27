import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";

import { SelectBox, type SelectBoxHandle } from "../src/SelectBox.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

const swapped = [
    { value: "apple", label: "Apple" },
    { value: "fig", label: "Fig" },
];

/** The mirror only has a form owner inside one, so every render needs a form. */
function formContainer(): HTMLElement {
    const form = document.createElement("form");
    document.body.append(form);
    return form;
}

function mirror(scope: HTMLElement): HTMLSelectElement {
    return scope.querySelector<HTMLSelectElement>("[data-select-form-mirror]")!;
}

function defaults(scope: HTMLElement): ReadonlyArray<string> {
    return [...mirror(scope).options]
        .filter((option) => option.defaultSelected)
        .map((option) => option.value);
}

/**
 * The mirror is the control the browser resets, so its default has to agree with
 * the default the controller restores. React writes `selected` as a property
 * only, which a native reset ignores — the mirror carries the default itself.
 */
describe("the React form mirror's reset baseline", () => {
    test("marks the initial selection as the default", () => {
        const form = formContainer();
        render(<SelectBox options={fruits} name="fruit" defaultValue="apple" />, {
            container: form,
        });

        expect(defaults(form)).toEqual(["apple"]);
    });

    test("moves the default onto whatever is selected now", () => {
        const handle = createRef<SelectBoxHandle>();
        const form = formContainer();
        render(
            <SelectBox
                ref={handle}
                options={fruits}
                name="fruit"
                defaultValue="apple"
            />,
            { container: form },
        );

        act(() => {
            handle.current!.controller.commitValue("pear");
        });

        expect(defaults(form)).toEqual(["pear"]);
    });

    test("keeps the default on the options rebuilt by an option-list change", () => {
        const form = formContainer();
        const view = render(
            <SelectBox options={fruits} name="fruit" defaultValue="apple" />,
            { container: form },
        );

        view.rerender(
            <SelectBox options={swapped} name="fruit" defaultValue="apple" />,
        );

        expect(defaults(form)).toEqual(["apple"]);
        expect([...mirror(form).options].map((option) => option.value)).toEqual(["", "apple"]);
    });

    test("holds only what submission needs, however long the option list is", () => {
        const form = formContainer();
        const many = Array.from({ length: 3_000 }, (_, index) => ({
            value: String(index),
            label: `Option ${index}`,
        }));

        render(<SelectBox options={many} name="fruit" defaultValue="7" />, { container: form });

        expect([...mirror(form).options].map((option) => option.value)).toEqual(["", "7"]);
    });

    test("keeps the selection in the mirror while a query filters it out of the list", () => {
        const form = formContainer();
        const handle = createRef<SelectBoxHandle>();
        render(
            <SelectBox ref={handle} options={fruits} name="fruit" defaultValue="apple" />,
            { container: form },
        );

        act(() => {
            handle.current!.controller.setQuery("zzzz");
        });

        expect(new FormData(form as HTMLFormElement).get("fruit")).toBe("apple");
    });

    test("keeps the empty option as the default when nothing is selected", () => {
        const form = formContainer();
        render(<SelectBox options={fruits} name="fruit" />, { container: form });

        expect(defaults(form)).toEqual([""]);
        expect(mirror(form).value).toBe("");
    });
});
