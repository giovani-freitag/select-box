import { describe, expect, test } from "vitest";

import { ListVirtualizer } from "../src/virtualizer/index.js";

describe("ListVirtualizer (fixed row height)", () => {
    test("reports the empty range when rowCount is 0", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 0,
            rowHeight: 32,
            viewportHeight: 200,
        });

        const range = virtualizer.getRange();

        expect(range.startIndex).toBe(0);
        expect(range.endIndex).toBe(-1);
        expect(range.totalHeight).toBe(0);
        expect(range.visibleRows).toHaveLength(0);
    });

    test("emits visible rows for the top of the viewport with overscan", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 100,
            rowHeight: 32,
            viewportHeight: 96,
            overscan: 2,
        });

        const range = virtualizer.getRange();

        expect(range.startIndex).toBe(0);
        expect(range.endIndex).toBe(4);
        expect(range.paddingTop).toBe(0);
        expect(range.paddingBottom).toBe((100 - 5) * 32);
        expect(range.totalHeight).toBe(100 * 32);
        expect(range.visibleRows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4]);
    });

    test("shifts the window when the scroll offset moves down", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 100,
            rowHeight: 32,
            viewportHeight: 96,
            overscan: 1,
        });

        virtualizer.setScrollOffset(320);
        const range = virtualizer.getRange();

        expect(range.startIndex).toBe(9);
        expect(range.endIndex).toBe(13);
        expect(range.paddingTop).toBe(9 * 32);
        expect(range.paddingBottom).toBe((100 - 14) * 32);
    });

    test("clamps the window at the end of the list", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 5,
            rowHeight: 32,
            viewportHeight: 64,
            overscan: 0,
        });

        virtualizer.setScrollOffset(120);
        const range = virtualizer.getRange();

        expect(range.endIndex).toBe(4);
        expect(range.paddingBottom).toBe(0);
    });

    test("notifies subscribers when the scroll offset changes the range", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 50,
            rowHeight: 32,
            viewportHeight: 64,
            overscan: 0,
        });
        let notifications = 0;
        virtualizer.subscribe(() => {
            notifications += 1;
        });

        virtualizer.setScrollOffset(200);

        expect(notifications).toBe(1);
    });

    test("setRowCount rebuilds the cached offset table", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 10,
            rowHeight: (index) => (index < 5 ? 40 : 24),
            viewportHeight: 100,
            overscan: 0,
        });

        const before = virtualizer.getRange().totalHeight;
        virtualizer.setRowCount(20);
        const after = virtualizer.getRange().totalHeight;

        expect(before).toBe(5 * 40 + 5 * 24);
        expect(after).toBe(5 * 40 + 15 * 24);
    });

    test("getOffset returns the cumulative pixel offset for any index", () => {
        const virtualizer = new ListVirtualizer({
            rowCount: 6,
            rowHeight: (index) => (index % 2 === 0 ? 40 : 30),
            viewportHeight: 100,
        });

        expect(virtualizer.getOffset(0)).toBe(0);
        expect(virtualizer.getOffset(1)).toBe(40);
        expect(virtualizer.getOffset(2)).toBe(70);
        expect(virtualizer.getOffset(6)).toBe(3 * 40 + 3 * 30);
    });
});

describe("ListVirtualizer (variable row height)", () => {
    test("places the window correctly with mixed row heights", () => {
        const heights = [40, 32, 32, 60, 32, 32, 32, 32, 32, 32];
        const virtualizer = new ListVirtualizer({
            rowCount: heights.length,
            rowHeight: (index) => heights[index]!,
            viewportHeight: 100,
            overscan: 0,
        });

        virtualizer.setScrollOffset(72);
        const range = virtualizer.getRange();

        // 72 falls inside row index 2 (offsets 0,40,72,104) so the window starts there
        expect(range.startIndex).toBe(2);
        expect(range.endIndex).toBeGreaterThanOrEqual(3);
    });
});

