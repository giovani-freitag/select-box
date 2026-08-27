import { act, fireEvent, render, type RenderResult } from "@testing-library/react";
import { createRef, type RefObject } from "react";

import type { JSX } from "react";

import {
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
    type ParityOption,
} from "@select-box/parity";

import { SelectBox, type SelectBoxHandle } from "../src/SelectBox.js";

/**
 * React drives its own handle rather than the shared DOM one so every
 * interaction goes through Testing Library's act-wrapped helpers, which is what
 * flushes React's render queue.
 */
interface ReactHandleConfig {
    readonly result: RenderResult;
    readonly handleRef: RefObject<SelectBoxHandle | null>;
    readonly rerenderWith: (options: ReadonlyArray<ParityOption>) => void;
    readonly rerenderMulti: (multiple: boolean) => void;
    readonly reported: ReadonlyArray<unknown>;
    readonly openStates: ReadonlyArray<boolean>;
}

function createReactHandle(config: ReactHandleConfig): ParityHandle {
    const { result, handleRef, reported, openStates } = config;

    function input(): HTMLInputElement {
        return result.container.querySelector<HTMLInputElement>("[data-select-input]")!;
    }

    async function flush(): Promise<void> {
        await act(() => Promise.resolve());
    }

    return {
        queryScope: () => result.container,
        publicRoot: () => handleRef.current?.root ?? null,
        publicController: () => handleRef.current?.controller ?? null,
        settle: flush,

        async setOptions(options: ReadonlyArray<ParityOption>): Promise<void> {
            act(() => config.rerenderWith(options));
            await flush();
        },

        async setMulti(multiple: boolean): Promise<void> {
            act(() => config.rerenderMulti(multiple));
            await flush();
        },

        async setValue(value: string | ReadonlyArray<string> | null): Promise<void> {
            act(() => handleRef.current!.controller.setValue(value));
            await flush();
        },

        reportedChanges: () => reported,
        reportedOpenStates: () => openStates,

        async focusInput(): Promise<void> {
            act(() => {
                input().focus();
            });
            await flush();
        },

        async typeIntoInput(text: string): Promise<void> {
            fireEvent.change(input(), { target: { value: text } });
            await flush();
        },

        async clickElement(element: Element): Promise<void> {
            fireEvent.mouseDown(element);
            fireEvent.click(element);
            await flush();
        },

        async pressKey(key: string): Promise<void> {
            fireEvent.keyDown(input(), { key });
            await flush();
        },

        async clickOutside(): Promise<void> {
            fireEvent.mouseDown(document.body);
            await flush();
        },

        async unmount(): Promise<void> {
            result.unmount();
            await flush();
        },
    };
}

describeParitySuite({
    name: "React",

    mount(config: ParityMountConfig): Promise<ParityHandle> {
        const handleRef = createRef<SelectBoxHandle>();
        const reported: unknown[] = [];
        const openStates: boolean[] = [];
        const element = (
            options: ReadonlyArray<ParityOption>,
            multiple: boolean = config.multiple,
        ): JSX.Element =>
            multiple ? (
                <SelectBox
                    multiple
                    ref={handleRef}
                    options={options}
                    placeholder={config.placeholder}
                    surface={config.surface}
                    addons={config.addons}
                    aria-label={config.ariaLabel}
                    emptyMessage={config.emptyMessage}
                    disabled={config.disabled === true}
                    readOnly={config.readOnly === true}
                    onChange={(values) => reported.push(values)}
                    onOpen={() => openStates.push(true)}
                    onClose={() => openStates.push(false)}
                />
            ) : (
                <SelectBox
                    ref={handleRef}
                    options={options}
                    placeholder={config.placeholder}
                    surface={config.surface}
                    addons={config.addons}
                    aria-label={config.ariaLabel}
                    emptyMessage={config.emptyMessage}
                    disabled={config.disabled === true}
                    readOnly={config.readOnly === true}
                    onChange={(value) => reported.push(value)}
                    onOpen={() => openStates.push(true)}
                    onClose={() => openStates.push(false)}
                />
            );
        const result = render(element(config.options));

        return Promise.resolve(
            createReactHandle({
                result,
                handleRef,
                rerenderWith: (options) => {
                    result.rerender(element(options));
                },
                rerenderMulti: (multiple) => {
                    result.rerender(element(config.options, multiple));
                },
                reported,
                openStates,
            }),
        );
    },
});
