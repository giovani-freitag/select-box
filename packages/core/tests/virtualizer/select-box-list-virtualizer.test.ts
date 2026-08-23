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

/**
 * Stands in for CSS layout, which no DOM shim runs. TanStack sizes the viewport
 * off `offsetWidth`/`offsetHeight`, so defining those is the only way to
 * exercise the branch a real browser takes.
 */
function reportHeight(element: HTMLElement, height: number): void {
    Object.defineProperty(element, "offsetHeight", {
        configurable: true,
        get: () => height,
    });
    Object.defineProperty(element, "offsetWidth", {
        configurable: true,
        get: () => 200,
    });
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

describe("SelectBoxListVirtualizer against a laid-out viewport", () => {
    const SMALL_FALLBACK = 60;
    const REAL_VIEWPORT = 300;

    let scrollElement: HTMLElement;

    function create(
        overrides: { readonly initialViewportHeight?: number } = {},
    ): SelectBoxListVirtualizer {
        return new SelectBoxListVirtualizer({
            getScrollElement: () => scrollElement,
            getCount: () => 1_000,
            estimateSize: () => ROW_HEIGHT,
            overscan: 0,
            ...overrides,
        });
    }

    function windowSize(virtualizer: SelectBoxListVirtualizer): number {
        return virtualizer.getVirtualItems().length;
    }

    beforeEach(() => {
        scrollElement = createScrollElement();
    });

    afterEach(() => {
        scrollElement.remove();
        vi.restoreAllMocks();
    });

    test("the measured height decides the window, overriding the fallback", () => {
        reportHeight(scrollElement, REAL_VIEWPORT);
        const virtualizer = create({ initialViewportHeight: SMALL_FALLBACK });

        virtualizer.mount();

        // 300px of 30px rows, no overscan: ten rows, not the fallback's two.
        expect(windowSize(virtualizer)).toBe(REAL_VIEWPORT / ROW_HEIGHT);
        virtualizer.dispose();
    });

    test("the fallback only stands in while the height reads zero", () => {
        reportHeight(scrollElement, 0);
        const virtualizer = create({ initialViewportHeight: SMALL_FALLBACK });

        virtualizer.mount();

        expect(windowSize(virtualizer)).toBe(SMALL_FALLBACK / ROW_HEIGHT);
        virtualizer.dispose();
    });

    test("a measured height is used with no fallback configured at all", () => {
        reportHeight(scrollElement, REAL_VIEWPORT);
        const virtualizer = create();

        virtualizer.mount();

        expect(windowSize(virtualizer)).toBe(REAL_VIEWPORT / ROW_HEIGHT);
        virtualizer.dispose();
    });

    test("a taller viewport renders strictly more rows than a shorter one", () => {
        reportHeight(scrollElement, 120);
        const short = create();
        short.mount();
        const shortWindow = windowSize(short);
        short.dispose();

        vi.restoreAllMocks();
        reportHeight(scrollElement, 360);
        const tall = create();
        tall.mount();

        expect(windowSize(tall)).toBeGreaterThan(shortWindow);
        tall.dispose();
    });

    test("the window follows the scroll offset instead of pinning to the top", () => {
        reportHeight(scrollElement, REAL_VIEWPORT);
        const virtualizer = create();
        virtualizer.mount();
        const firstIndex = virtualizer.getVirtualItems()[0]?.index;

        // The real path a browser takes: the element scrolls and emits, and
        // TanStack recomputes the window from the new offset.
        scrollElement.scrollTop = 500 * ROW_HEIGHT;
        scrollElement.dispatchEvent(new Event("scroll"));

        const window = virtualizer.getVirtualItems();
        expect(firstIndex).toBe(0);
        expect(window[0]?.index).toBe(500);
        expect(window.length).toBe(REAL_VIEWPORT / ROW_HEIGHT);
        virtualizer.dispose();
    });

    test("every row in the window carries a real offset and size", () => {
        reportHeight(scrollElement, REAL_VIEWPORT);
        const virtualizer = create();
        virtualizer.mount();

        const items = virtualizer.getVirtualItems();

        expect(items.length).toBeGreaterThan(1);
        items.forEach((item, position) => {
            expect(item.size).toBe(ROW_HEIGHT);
            expect(item.start).toBe(item.index * ROW_HEIGHT);
            if (position > 0) {
                expect(item.index).toBe((items[position - 1]?.index ?? -1) + 1);
            }
        });
        virtualizer.dispose();
    });
});
