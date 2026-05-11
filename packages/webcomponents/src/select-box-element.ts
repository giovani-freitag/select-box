import {
    SingleSelectBoxController,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxSnapshot,
    type SelectGroup,
    type SelectOption,
} from "@select-box/core";

import { renderSelectBoxShadow, type SelectBoxShadowRefs } from "./render.js";

const OBSERVED_ATTRIBUTES = ["placeholder", "ungrouped-label"] as const;

/**
 * `<select-box>` custom element backed by `SingleSelectBoxController`, rendered into Shadow DOM.
 */
export class SelectBoxElement<TValue = unknown> extends HTMLElement {
    static get observedAttributes(): ReadonlyArray<string> {
        return OBSERVED_ATTRIBUTES;
    }

    private controller: SingleSelectBoxController<TValue> | null = null;
    private unsubscribeFromStore: (() => void) | null = null;
    private refs: SelectBoxShadowRefs | null = null;
    private previousValue: TValue | null = null;

    private pendingOptions: ReadonlyArray<SelectOption<TValue>> | undefined;
    private pendingGroups: ReadonlyArray<SelectGroup<TValue>> | undefined;
    private pendingAddons: ReadonlyArray<SelectBoxAddon<TValue>> | undefined;
    private pendingFilter: OptionFilterStrategy<TValue> | undefined;
    private pendingValue: TValue | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback(): void {
        this.refs = renderSelectBoxShadow(this.shadowRoot!);
        this.controller = new SingleSelectBoxController<TValue>({
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingGroups !== undefined ? { groups: this.pendingGroups } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.previousValue = this.pendingValue;
        this.listen();
        this.handleSnapshotChange();
    }

    disconnectedCallback(): void {
        this.unlisten();
        this.controller?.destroy();
        this.controller = null;
        this.refs = null;
    }

    attributeChangedCallback(name: string, _previous: string | null, _next: string | null): void {
        if (!this.refs) return;
        if (name === "placeholder" || name === "ungrouped-label") {
            this.handleSnapshotChange();
        }
    }

    get options(): ReadonlyArray<SelectOption<TValue>> | undefined {
        return this.pendingOptions;
    }
    set options(next: ReadonlyArray<SelectOption<TValue>> | undefined) {
        this.pendingOptions = next;
        this.rebuildControllerIfConnected();
    }

    get groups(): ReadonlyArray<SelectGroup<TValue>> | undefined {
        return this.pendingGroups;
    }
    set groups(next: ReadonlyArray<SelectGroup<TValue>> | undefined) {
        this.pendingGroups = next;
        this.rebuildControllerIfConnected();
    }

    get value(): TValue | null {
        return this.controller?.getState().value ?? this.pendingValue;
    }
    set value(next: TValue | null) {
        this.pendingValue = next;
        this.rebuildControllerIfConnected();
    }

    get addons(): ReadonlyArray<SelectBoxAddon<TValue>> | undefined {
        return this.pendingAddons;
    }
    set addons(next: ReadonlyArray<SelectBoxAddon<TValue>> | undefined) {
        this.pendingAddons = next;
        this.rebuildControllerIfConnected();
    }

    get filter(): OptionFilterStrategy<TValue> | undefined {
        return this.pendingFilter;
    }
    set filter(next: OptionFilterStrategy<TValue> | undefined) {
        this.pendingFilter = next;
        this.rebuildControllerIfConnected();
    }

    private rebuildControllerIfConnected(): void {
        if (!this.isConnected || !this.refs) return;
        this.unlisten();
        this.controller?.destroy();
        this.controller = new SingleSelectBoxController<TValue>({
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingGroups !== undefined ? { groups: this.pendingGroups } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.previousValue = this.pendingValue;
        this.listen();
        this.handleSnapshotChange();
    }

    private listen(): void {
        if (!this.refs || !this.controller) return;
        this.unsubscribeFromStore = this.controller.subscribe(this.handleSnapshotChange);
        this.refs.trigger.addEventListener("click", this.handleTriggerClick);
        this.refs.search.addEventListener("input", this.handleSearchInput);
        this.refs.search.addEventListener("keydown", this.handleSearchKeyDown);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.refs?.trigger.removeEventListener("click", this.handleTriggerClick);
        this.refs?.search.removeEventListener("input", this.handleSearchInput);
        this.refs?.search.removeEventListener("keydown", this.handleSearchKeyDown);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private readonly handleTriggerClick = (): void => {
        this.controller?.toggle();
    };

    private readonly handleSearchInput = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        this.controller?.setQuery(input.value);
    };

    private readonly handleSearchKeyDown = (event: KeyboardEvent): void => {
        if (!this.controller) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.controller.moveActive(1);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.controller.moveActive(-1);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            this.controller.commitActive();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            this.controller.close();
        }
    };

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.controller?.getState().open) return;
        const path = event.composedPath();
        if (path.includes(this)) return;
        this.controller.close();
    };

    private readonly handleSnapshotChange = (): void => {
        if (!this.refs || !this.controller) return;
        const snapshot = this.controller.getState();
        this.paintSnapshot(snapshot);
        if (!Object.is(snapshot.value, this.previousValue)) {
            this.previousValue = snapshot.value;
            // Match the native form-element contract: plain `change` event
            // that bubbles to parent forms. The value is read off the
            // element via the `.value` getter, just like `<select>`.
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
    };

    private paintSnapshot(snapshot: SelectBoxSnapshot<TValue>): void {
        if (!this.refs) return;
        const placeholder = this.getAttribute("placeholder") ?? "Select…";

        this.refs.value.textContent = snapshot.selectedOption?.label ?? placeholder;
        this.refs.value.classList.toggle("placeholder", snapshot.selectedOption === null);
        this.refs.trigger.setAttribute("aria-expanded", String(snapshot.open));

        this.refs.popover.hidden = !snapshot.open;
        if (!snapshot.open) {
            this.refs.search.value = "";
            return;
        }

        if (this.refs.search.value !== snapshot.query) {
            this.refs.search.value = snapshot.query;
        }
        this.refs.search.placeholder = placeholder;
        this.paintList(snapshot);

        if (document.activeElement !== this.refs.search) {
            this.refs.search.focus({ preventScroll: true });
        }
    }

    private paintList(snapshot: SelectBoxSnapshot<TValue>): void {
        if (!this.refs) return;
        const list = this.refs.list;
        list.replaceChildren();

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "empty";
            empty.setAttribute("part", "empty");
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            list.append(empty);
            return;
        }

        let flatIndex = -1;
        for (const group of snapshot.filteredGroups) {
            const groupElement = document.createElement("div");
            groupElement.className = "group";
            groupElement.setAttribute("part", "group");
            groupElement.dataset["selectGroup"] = "";

            if (group.label) {
                const label = document.createElement("div");
                label.className = "group-label";
                label.setAttribute("part", "group-label");
                label.textContent = group.label;
                groupElement.append(label);
            }

            for (const option of group.options) {
                const isSelectable = !option.disabled;
                if (isSelectable) flatIndex += 1;
                const isActive = isSelectable && flatIndex === snapshot.activeIndex;

                const button = document.createElement("button");
                button.type = "button";
                button.className = "option";
                const parts = ["option"];
                if (isActive) parts.push("option-active");
                if (option.disabled) parts.push("option-disabled");
                button.setAttribute("part", parts.join(" "));
                button.dataset["selectOption"] = "";
                if (isActive) {
                    button.classList.add("active");
                    button.dataset["selectActive"] = "";
                }
                if (option.disabled) {
                    button.classList.add("disabled");
                    button.disabled = true;
                }
                button.textContent = option.label;
                button.addEventListener("mousedown", (event) => event.preventDefault());
                button.addEventListener("click", () => {
                    this.controller?.commitOption(option);
                });
                groupElement.append(button);
            }

            list.append(groupElement);
        }
    }
}
