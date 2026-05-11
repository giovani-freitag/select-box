import type { SelectBoxSnapshot, SingleSelectBoxController } from "@select-box/react";
import { useEffect, useRef, type KeyboardEvent } from "react";

interface SelectBoxComboboxProps<TValue> {
    readonly state: SelectBoxSnapshot<TValue>;
    readonly controller: SingleSelectBoxController<TValue>;
    readonly placeholder?: string;
}

export function SelectBoxCombobox<TValue>(props: SelectBoxComboboxProps<TValue>) {
    const { state, controller, placeholder } = props;
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!state.open) return;
        function handleClickOutside(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                controller.close();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [state.open, controller]);

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!state.open) controller.open();
            else controller.moveActive(1);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            controller.moveActive(-1);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            controller.commitActive();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            controller.close();
        }
    }

    let flatIndex = -1;

    return (
        <div ref={rootRef} className="combobox" data-select-root>
            <button
                type="button"
                className="combobox-trigger"
                onClick={() => controller.toggle()}
                data-select-trigger
                aria-expanded={state.open}
            >
                <span className={state.selectedOption ? "value" : "value placeholder"}>
                    {state.selectedOption?.label ?? placeholder ?? "Select…"}
                </span>
                <span className="caret" aria-hidden>
                    ▾
                </span>
            </button>

            {state.open ? (
                <div className="combobox-popover" role="listbox">
                    <input
                        className="combobox-search"
                        type="text"
                        autoFocus
                        placeholder={placeholder ?? "Search…"}
                        value={state.query}
                        onChange={(event) => controller.setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        data-select-search
                    />

                    <div className="combobox-list">
                        {state.isEmpty ? (
                            <p className="empty">No matches</p>
                        ) : (
                            state.filteredGroups.map((group) => (
                                <div key={group.key} className="group" data-select-group>
                                    {group.label ? <div className="group-label">{group.label}</div> : null}
                                    {group.options.map((option) => {
                                        flatIndex += option.disabled ? 0 : 1;
                                        const active = !option.disabled && flatIndex === state.activeIndex;
                                        return (
                                            <button
                                                key={String(option.value)}
                                                type="button"
                                                className={`option${active ? " active" : ""}${option.disabled ? " disabled" : ""}`}
                                                disabled={option.disabled}
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => controller.commitOption(option)}
                                                data-select-option
                                                data-select-active={active ? "" : undefined}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
