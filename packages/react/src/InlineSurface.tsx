import {
    SelectBoxSnapshotView,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import {
    Fragment,
    useMemo,
    type CSSProperties,
    type FocusEventHandler,
    type JSX,
    type Ref,
} from "react";

import { FormMirror } from "./FormMirror.js";

export interface InlineSurfaceProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly rootRef: Ref<HTMLDivElement> | undefined;
    readonly name: string | undefined;
    readonly required: boolean | undefined;
    readonly className: string | undefined;
    readonly style: CSSProperties | undefined;
    readonly id: string | undefined;
    // The inline surface renders no input, so focus events belong to the root.
    readonly onBlur: FocusEventHandler<HTMLDivElement> | undefined;
    readonly onFocus: FocusEventHandler<HTMLDivElement> | undefined;
    readonly ariaLabel: string | undefined;
    readonly ariaLabelledby: string | undefined;
}

/**
 * Inline-chip surface: every option is rendered as a toggleable chip; clicking
 * a chip commits it through the active selection driver (single replaces,
 * multi toggles). No popover, no trigger input, no search — group headers are
 * still rendered above their chips when the option set is grouped.
 */
export function InlineSurface<TExtra extends object>({
    state,
    controller,
    rootRef,
    name,
    required,
    className,
    style,
    id,
    onBlur,
    onFocus,
    ariaLabel,
    ariaLabelledby,
}: InlineSurfaceProps<TExtra>): JSX.Element {
    const isMulti = state.mode === "multi";
    const view = useMemo(
        () => new SelectBoxSnapshotView<TExtra, SelectionValue>(state),
        [state],
    );

    const rootClassName = [
        "select-box",
        isMulti ? "select-box-multi" : null,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    function handleChipClick(option: SelectOption<TExtra>): void {
        // The chips carry `aria-disabled` rather than the native attribute, so
        // refusing the click is this handler's job now.
        if (option.disabled === true || state.disabled || state.readOnly) return;
        controller.commitOption(option);
    }

    return (
        <div
            ref={rootRef}
            className={rootClassName}
            style={style}
            id={id}
            onBlur={onBlur}
            onFocus={onFocus}
            data-select-root
            data-select-mode={state.mode}
        >
            <FormMirror state={state} controller={controller} name={name} required={required} />
            {/* The surface is a child of the root in every wrapper, so the root
                never doubles as a listbox and one selector addresses either. */}
            <div
                className="select-box-inline"
                role="listbox"
                aria-multiselectable={isMulti ? true : undefined}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                data-select-surface="inline"
            >
            {state.filteredGroups.map((group) => (
                <Fragment key={group.key}>
                    {group.label ? (
                        <div
                            className="select-box-group-label"
                            data-select-group-label
                        >
                            {group.label}
                        </div>
                    ) : null}
                    <div className="select-box-tags" data-select-tags>
                        {group.options.map((option) => {
                            const isSelected = view.isSelected(option.value);
                            const chipClassName = [
                                "select-box-chip",
                                "select-box-chip-selectable",
                                isSelected ? "select-box-chip-selected" : null,
                                option.disabled ? "select-box-chip-disabled" : null,
                            ]
                                .filter(Boolean)
                                .join(" ");
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-pressed={isSelected}
                                    aria-disabled={
                                        option.disabled === true || state.disabled || state.readOnly
                                            ? true
                                            : undefined
                                    }
                                    className={chipClassName}
                                    onClick={() => handleChipClick(option)}
                                    data-select-chip
                                    data-select-option
                                    data-select-selected={isSelected ? "" : undefined}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </Fragment>
            ))}
            </div>
        </div>
    );
}
