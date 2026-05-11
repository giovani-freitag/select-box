import {
    SingleSelectBoxController,
    type SelectBoxSnapshot,
    type SelectOption,
    type SingleSelectBoxConfig,
} from "@select-box/core";

/**
 * Light-DOM combobox view that wires a `SingleSelectBoxController` into a host element.
 */
export class SelectBoxView<TValue> {
    readonly root: HTMLDivElement;

    private readonly controller: SingleSelectBoxController<TValue>;
    private readonly trigger: HTMLButtonElement;
    private readonly value: HTMLSpanElement;
    private readonly popover: HTMLDivElement;
    private readonly search: HTMLInputElement;
    private readonly list: HTMLDivElement;

    private unsubscribeFromStore: (() => void) | null = null;
    private previousValue: TValue | null = null;
    private readonly onValueChange: ((value: TValue | null) => void) | undefined;
    private readonly placeholder: string;

    constructor(config: SingleSelectBoxConfig<TValue> & {
        readonly placeholder?: string;
        readonly onValueChange?: (value: TValue | null) => void;
    }) {
        this.controller = new SingleSelectBoxController<TValue>(config);
        this.previousValue = this.controller.getState().value;
        this.placeholder = config.placeholder ?? "Select…";
        this.onValueChange = config.onValueChange;

        this.root = document.createElement("div");
        this.root.className = "select-box";
        this.root.dataset["selectRoot"] = "";

        this.trigger = this.createTrigger();
        this.value = this.trigger.querySelector<HTMLSpanElement>(".select-box-value")!;
        this.popover = this.createPopover();
        this.search = this.popover.querySelector<HTMLInputElement>(".select-box-search")!;
        this.list = this.popover.querySelector<HTMLDivElement>(".select-box-list")!;

        this.root.append(this.trigger, this.popover);
        this.listen();
        this.paint(this.controller.getState());
    }

    destroy(): void {
        this.unlisten();
        this.controller.destroy();
        this.root.remove();
    }

    getController(): SingleSelectBoxController<TValue> {
        return this.controller;
    }

    open(): void {
        this.controller.open();
    }

    close(): void {
        this.controller.close();
    }

    toggle(): void {
        this.controller.toggle();
    }

    clear(): void {
        this.controller.clear();
    }

    private createTrigger(): HTMLButtonElement {
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "select-box-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.dataset["selectTrigger"] = "";

        const value = document.createElement("span");
        value.className = "select-box-value";

        const caret = document.createElement("span");
        caret.className = "select-box-caret";
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "▾";

        trigger.append(value, caret);
        return trigger;
    }

    private createPopover(): HTMLDivElement {
        const popover = document.createElement("div");
        popover.className = "select-box-popover";
        popover.setAttribute("role", "listbox");
        popover.dataset["selectPopover"] = "";
        popover.hidden = true;

        const search = document.createElement("input");
        search.type = "text";
        search.className = "select-box-search";
        search.dataset["selectSearch"] = "";

        const list = document.createElement("div");
        list.className = "select-box-list";
        list.dataset["selectList"] = "";

        popover.append(search, list);
        return popover;
    }

    private listen(): void {
        this.unsubscribeFromStore = this.controller.subscribe(this.handleSnapshotChange);
        this.trigger.addEventListener("click", this.handleTriggerClick);
        this.search.addEventListener("input", this.handleSearchInput);
        this.search.addEventListener("keydown", this.handleSearchKeyDown);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.trigger.removeEventListener("click", this.handleTriggerClick);
        this.search.removeEventListener("input", this.handleSearchInput);
        this.search.removeEventListener("keydown", this.handleSearchKeyDown);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private readonly handleTriggerClick = (): void => {
        this.controller.toggle();
    };

    private readonly handleSearchInput = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        this.controller.setQuery(input.value);
    };

    private readonly handleSearchKeyDown = (event: KeyboardEvent): void => {
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
        if (!this.controller.getState().open) return;
        if (!(event.target instanceof Node)) return;
        if (this.root.contains(event.target)) return;
        this.controller.close();
    };

    private readonly handleSnapshotChange = (): void => {
        const snapshot = this.controller.getState();
        this.paint(snapshot);
        if (!Object.is(snapshot.value, this.previousValue)) {
            this.previousValue = snapshot.value;
            this.onValueChange?.(snapshot.value);
        }
    };

    private paint(snapshot: SelectBoxSnapshot<TValue>): void {
        this.value.textContent = snapshot.selectedOption?.label ?? this.placeholder;
        this.value.classList.toggle("select-box-placeholder", snapshot.selectedOption === null);
        this.trigger.setAttribute("aria-expanded", String(snapshot.open));

        this.popover.hidden = !snapshot.open;
        if (!snapshot.open) {
            this.search.value = "";
            return;
        }

        if (this.search.value !== snapshot.query) {
            this.search.value = snapshot.query;
        }
        this.search.placeholder = this.placeholder;
        this.paintList(snapshot);

        if (document.activeElement !== this.search) {
            this.search.focus({ preventScroll: true });
        }
    }

    private paintList(snapshot: SelectBoxSnapshot<TValue>): void {
        this.list.replaceChildren();

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "select-box-empty";
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            this.list.append(empty);
            return;
        }

        let flatIndex = -1;
        for (const group of snapshot.filteredGroups) {
            const groupElement = document.createElement("div");
            groupElement.className = "select-box-group";
            groupElement.dataset["selectGroup"] = "";

            if (group.label) {
                const label = document.createElement("div");
                label.className = "select-box-group-label";
                label.textContent = group.label;
                groupElement.append(label);
            }

            for (const option of group.options) {
                const isSelectable = !option.disabled;
                if (isSelectable) flatIndex += 1;
                const isActive = isSelectable && flatIndex === snapshot.activeIndex;
                groupElement.append(this.createOptionButton(option, isActive));
            }

            this.list.append(groupElement);
        }
    }

    private createOptionButton(option: SelectOption<TValue>, isActive: boolean): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        const classes = ["select-box-option"];
        if (isActive) classes.push("select-box-option-active");
        if (option.disabled) classes.push("select-box-option-disabled");
        button.className = classes.join(" ");
        button.dataset["selectOption"] = "";
        if (isActive) button.dataset["selectActive"] = "";
        if (option.disabled) button.disabled = true;
        button.textContent = option.label;
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => this.controller.commitOption(option));
        return button;
    }
}
