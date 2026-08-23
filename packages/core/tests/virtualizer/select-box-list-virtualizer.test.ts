// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

    function create(getCount: () => number): SelectBoxListVirtualizer {
        return new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount,
            estimateSize: () => ROW_HEIGHT,
            initialViewportHeight: VIEWPORT_HEIGHT,
        });
    }

    beforeEach(() => {
        scrollElement = createScrollElement();
    });

    afterEach(() => {
        scrollElement.remove();
        vi.restoreAllMocks();
    });

    test("getTotalSize reflects count × estimateSize before mount", () => {
        const virtualizer = create(() => 100);

        expect(virtualizer.getTotalSize()).toBe(100 * ROW_HEIGHT);
    });

    test("renders a bounded window rather than every row", () => {
        const virtualizer = create(() => 10_000);
        virtualizer.mount();

        const window = virtualizer.getVirtualItems();

        expect(window.length).toBeGreaterThan(0);
        expect(window.length).toBeLessThan(VIEWPORT_HEIGHT / ROW_HEIGHT + 20);
        virtualizer.dispose();
    });

    test("syncCount picks up the latest count and the total size follows", () => {
        let total = 5;
        const virtualizer = create(() => total);

        total = 25;
        virtualizer.syncCount();

        expect(virtualizer.getTotalSize()).toBe(25 * ROW_HEIGHT);
    });

    test("syncCount notifies subscribers so they can repaint the new window", () => {
        let total = 5;
        const virtualizer = create(() => total);
        let notifications = 0;
        virtualizer.subscribe(() => {
            notifications += 1;
        });

        total = 25;
        virtualizer.syncCount();

        expect(notifications).toBe(1);
    });

    test("syncCount stays quiet when the count did not move", () => {
        const virtualizer = create(() => 5);
        let notifications = 0;
        virtualizer.subscribe(() => {
            notifications += 1;
        });

        virtualizer.syncCount();

        expect(notifications).toBe(0);
    });

    test("dispose drops the subscribers, so a later count change notifies nobody", () => {
        let total = 5;
        const virtualizer = create(() => total);
        let notifications = 0;
        virtualizer.subscribe(() => {
            notifications += 1;
        });
        virtualizer.mount();

        virtualizer.dispose();
        total = 25;
        virtualizer.syncCount();

        expect(notifications).toBe(0);
    });

    test("dispose releases the scroll listener it installed", () => {
        const removeSpy = vi.spyOn(scrollElement, "removeEventListener");
        const virtualizer = create(() => 10);
        virtualizer.mount();

        virtualizer.dispose();

        expect(removeSpy.mock.calls.map(([type]) => type)).toContain("scroll");
    });

    test("the unsubscriber stops further notifications", () => {
        let total = 5;
        const virtualizer = create(() => total);
        let notifications = 0;
        const unsubscribe = virtualizer.subscribe(() => {
            notifications += 1;
        });

        unsubscribe();
        total = 25;
        virtualizer.syncCount();

        expect(notifications).toBe(0);
    });

    test("a change raised from inside a listener defers to a microtask", async () => {
        let total = 5;
        const virtualizer = create(() => total);
        const order: string[] = [];
        virtualizer.subscribe(() => {
            order.push("notified");
            // Reentrancy: the listener itself moves the count again.
            if (total === 25) {
                total = 40;
                virtualizer.syncCount();
            }
        });

        total = 25;
        virtualizer.syncCount();

        expect(order).toEqual(["notified"]);
        await Promise.resolve();
        expect(order).toEqual(["notified", "notified"]);
    });

    test("measureElement(null) is safe and does not throw", () => {
        const virtualizer = create(() => 1);
        virtualizer.mount();

        expect(() => virtualizer.measureElement(null)).not.toThrow();

        virtualizer.dispose();
    });

    test("scrollToIndex does not throw when the scroll element is mounted", () => {
        const virtualizer = create(() => 50);
        virtualizer.mount();

        expect(() => virtualizer.scrollToIndex(10, "auto")).not.toThrow();

        virtualizer.dispose();
    });
});
