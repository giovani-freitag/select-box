// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { SelectBoxListVirtualizer } from "../../src/virtualizer/select-box-list-virtualizer.js";

const ROW_HEIGHT = 30;
const VIEWPORT_HEIGHT = 240;

function createScrollElement(): HTMLElement {
    const scrollElement = document.createElement("div");
    scrollElement.style.maxHeight = `${VIEWPORT_HEIGHT}px`;
    scrollElement.style.overflowY = "auto";
    document.body.append(scrollElement);
    return scrollElement;
}

describe("SelectBoxListVirtualizer", () => {
    let scrollElement: HTMLElement;

    beforeEach(() => {
        scrollElement = createScrollElement();
    });

    afterEach(() => {
        scrollElement.remove();
    });

    test("getTotalSize reflects count × estimateSize before mount", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 100,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });

        expect(virtualizer.getTotalSize()).toBe(100 * ROW_HEIGHT);
    });

    test("syncCount picks up the latest count from the getter and the total size follows", () => {
        let total = 5;
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => total,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });

        total = 25;
        virtualizer.syncCount();

        expect(virtualizer.getTotalSize()).toBe(25 * ROW_HEIGHT);
    });

    test("mount + dispose pair leaves no dangling listeners", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 10,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });
        let notifications = 0;
        virtualizer.subscribe(() => {
            notifications += 1;
        });

        virtualizer.mount();
        virtualizer.dispose();

        const before = notifications;
        virtualizer.syncCount();

        expect(notifications).toBe(before);
    });

    test("subscribe returns an unsubscriber that stops further notifications", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 10,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });
        let notifications = 0;
        const unsubscribe = virtualizer.subscribe(() => {
            notifications += 1;
        });

        unsubscribe();
        virtualizer.mount();
        virtualizer.dispose();

        expect(notifications).toBe(0);
    });

    test("mount is idempotent: calling it twice does not reinstall the scroll listener", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 10,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });

        virtualizer.mount();

        expect(() => virtualizer.mount()).not.toThrow();
        virtualizer.dispose();
    });

    test("measureElement(null) is safe and does not throw", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 1,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });
        virtualizer.mount();

        expect(() => virtualizer.measureElement(null)).not.toThrow();

        virtualizer.dispose();
    });

    test("scrollToIndex does not throw when the scroll element is mounted", () => {
        const virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 50,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });
        virtualizer.mount();

        expect(() => virtualizer.scrollToIndex(10, "auto")).not.toThrow();

        virtualizer.dispose();
    });
});
