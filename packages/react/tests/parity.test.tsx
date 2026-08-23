import { act, fireEvent, render, type RenderResult } from "@testing-library/react";
import { createRef, type RefObject } from "react";

import {
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import { SelectBox, type SelectBoxHandle } from "../src/SelectBox.js";

/**
 * React drives its own handle rather than the shared DOM one so every
 * interaction goes through Testing Library's act-wrapped helpers, which is what
 * flushes React's render queue.
 */
function createReactHandle(
    result: RenderResult,
    handleRef: RefObject<SelectBoxHandle | null>,
): ParityHandle {
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
        const result = config.multi
            ? render(
                  <SelectBox
                      multi
                      ref={handleRef}
                      options={config.options}
                      placeholder={config.placeholder}
                      surface={config.surface}
                  />,
              )
            : render(
                  <SelectBox
                      ref={handleRef}
                      options={config.options}
                      placeholder={config.placeholder}
                      surface={config.surface}
                  />,
              );

        return Promise.resolve(createReactHandle(result, handleRef));
    },
});
