import { Store } from "../store.js";

export interface ListVirtualizerConfig {
    readonly rowCount: number;
    /** Fixed pixel height for every row, or a per-row function (sampled lazily). */
    readonly rowHeight: number | ((index: number) => number);
    readonly viewportHeight: number;
    /** Rows kept rendered above and below the viewport. Defaults to 3. */
    readonly overscan?: number;
}

export interface VirtualRow {
    readonly index: number;
    readonly offset: number;
    readonly height: number;
}

export interface VirtualRange {
    readonly startIndex: number;
    /** Inclusive end. `-1` when the row count is `0`. */
    readonly endIndex: number;
    readonly paddingTop: number;
    readonly paddingBottom: number;
    readonly totalHeight: number;
    readonly visibleRows: ReadonlyArray<VirtualRow>;
}

const EMPTY_RANGE: VirtualRange = {
    startIndex: 0,
    endIndex: -1,
    paddingTop: 0,
    paddingBottom: 0,
    totalHeight: 0,
    visibleRows: [],
};

const DEFAULT_OVERSCAN = 3;

/** Windowed list: returns which row indices fall inside the viewport for the current scroll offset. */
export class ListVirtualizer {
    private readonly store: Store<VirtualRange>;
    private rowCount: number;
    private rowHeight: number | ((index: number) => number);
    private viewportHeight: number;
    private overscan: number;
    private scrollOffset = 0;
    /** Lazily built prefix-sum cache for variable row heights. */
    private offsetsCache: number[] | null = null;

    constructor(config: ListVirtualizerConfig) {
        this.rowCount = config.rowCount;
        this.rowHeight = config.rowHeight;
        this.viewportHeight = config.viewportHeight;
        this.overscan = config.overscan ?? DEFAULT_OVERSCAN;
        this.store = new Store(this.computeRange());
    }

    getRange(): VirtualRange {
        return this.store.getState();
    }

    subscribe(listener: () => void): () => void {
        return this.store.subscribe(listener);
    }

    setRowCount(rowCount: number): void {
        if (rowCount === this.rowCount) return;
        this.rowCount = rowCount;
        this.offsetsCache = null;
        this.publish();
    }

    setRowHeight(rowHeight: number | ((index: number) => number)): void {
        this.rowHeight = rowHeight;
        this.offsetsCache = null;
        this.publish();
    }

    setViewportHeight(height: number): void {
        if (height === this.viewportHeight) return;
        this.viewportHeight = height;
        this.publish();
    }

    setScrollOffset(offset: number): void {
        const clamped = Math.max(0, offset);
        if (clamped === this.scrollOffset) return;
        this.scrollOffset = clamped;
        this.publish();
    }

    setOverscan(overscan: number): void {
        if (overscan === this.overscan) return;
        this.overscan = Math.max(0, overscan);
        this.publish();
    }

    /** Pixel offset of `index` from the top of the list, regardless of the visible range. */
    getOffset(index: number): number {
        if (this.rowCount === 0 || index <= 0) return 0;
        const clamped = Math.min(index, this.rowCount);
        if (typeof this.rowHeight === "number") return clamped * this.rowHeight;
        return this.ensureOffsets()[clamped] ?? 0;
    }

    destroy(): void {
        this.offsetsCache = null;
    }

    private publish(): void {
        this.store.setState(this.computeRange());
    }

    private computeRange(): VirtualRange {
        if (this.rowCount === 0) return EMPTY_RANGE;
        const totalHeight = this.getOffset(this.rowCount);
        const startIndex = Math.max(0, this.findStartIndex() - this.overscan);
        const endIndex = Math.min(
            this.rowCount - 1,
            this.findEndIndex(startIndex) + this.overscan,
        );
        const visibleRows = this.collectRows(startIndex, endIndex);
        const paddingTop = this.getOffset(startIndex);
        const paddingBottom = totalHeight - this.getOffset(endIndex + 1);
        return { startIndex, endIndex, paddingTop, paddingBottom, totalHeight, visibleRows };
    }

    private findStartIndex(): number {
        if (typeof this.rowHeight === "number") {
            return Math.max(0, Math.floor(this.scrollOffset / this.rowHeight));
        }
        return binarySearchForOffset(this.ensureOffsets(), this.scrollOffset);
    }

    private findEndIndex(startIndex: number): number {
        const limit = this.scrollOffset + this.viewportHeight;
        if (typeof this.rowHeight === "number") {
            return Math.min(this.rowCount - 1, Math.ceil(limit / this.rowHeight) - 1);
        }
        const offsets = this.ensureOffsets();
        let current = startIndex;
        while (current < this.rowCount - 1 && offsets[current + 1]! < limit) {
            current += 1;
        }
        return current;
    }

    private collectRows(startIndex: number, endIndex: number): VirtualRow[] {
        const rows: VirtualRow[] = [];
        for (let index = startIndex; index <= endIndex; index += 1) {
            rows.push({
                index,
                offset: this.getOffset(index),
                height: this.getRowHeight(index),
            });
        }
        return rows;
    }

    private getRowHeight(index: number): number {
        if (typeof this.rowHeight === "number") return this.rowHeight;
        return this.rowHeight(index);
    }

    private ensureOffsets(): number[] {
        if (this.offsetsCache !== null) return this.offsetsCache;
        const offsets: number[] = new Array(this.rowCount + 1);
        offsets[0] = 0;
        for (let index = 0; index < this.rowCount; index += 1) {
            offsets[index + 1] = offsets[index]! + this.getRowHeight(index);
        }
        this.offsetsCache = offsets;
        return offsets;
    }
}

function binarySearchForOffset(offsets: ReadonlyArray<number>, target: number): number {
    let low = 0;
    let high = offsets.length - 2;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const start = offsets[mid]!;
        const end = offsets[mid + 1]!;
        if (target < start) high = mid - 1;
        else if (target >= end) low = mid + 1;
        else return mid;
    }
    return Math.max(0, Math.min(low, offsets.length - 2));
}
