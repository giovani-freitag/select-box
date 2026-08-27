/** A scheduled run that has not finished, and can be called off. */
export interface IdleWork {
    /** Stops the remaining slices. Safe to call after the work already finished. */
    cancel(): void;
}

/** One slice of work: returns `true` while there is more to do. */
export type IdleStep = () => boolean;

const IDLE_TIMEOUT_MS = 200;

interface IdleDeadline {
    timeRemaining(): number;
    readonly didTimeout: boolean;
}

type IdleScheduler = (callback: (deadline: IdleDeadline) => void) => void;

interface IdleCallbackHost {
    requestIdleCallback?: (
        callback: (deadline: IdleDeadline) => void,
        options?: { timeout: number },
    ) => number;
}

function idleScheduler(): IdleScheduler {
    const host = globalThis as IdleCallbackHost;
    const requestIdle = host.requestIdleCallback;
    if (typeof requestIdle === "function") {
        return (callback) => {
            requestIdle.call(globalThis, callback, { timeout: IDLE_TIMEOUT_MS });
        };
    }

    // Node, jsdom and older Safari have no idle callback. A macrotask still
    // yields to whatever is already queued, which is the point.
    return (callback) => {
        const timer = setTimeout(() => callback({ timeRemaining: () => 0, didTimeout: true }), 0);
        // Never keep a process alive for background work nobody is waiting on.
        (timer as unknown as { unref?: () => void }).unref?.();
    };
}

/**
 * Runs `step` repeatedly in the browser's spare time until it reports it is done.
 *
 * Each call drives one slice, so a long job never holds the main thread for
 * more than a slice at a time. Callers must stay correct if the work never
 * runs at all — it is an optimization, not a guarantee.
 *
 * @param step - One slice of work; returns `true` while more remains.
 * @returns A handle that stops the remaining slices.
 */
export function runWhenIdle(step: IdleStep): IdleWork {
    const schedule = idleScheduler();
    let cancelled = false;

    const pump = (deadline: IdleDeadline): void => {
        if (cancelled) return;

        let more = true;
        do {
            more = step();
        } while (more && !cancelled && deadline.timeRemaining() > 1);

        if (more && !cancelled) schedule(pump);
    };

    schedule(pump);

    return {
        cancel(): void {
            cancelled = true;
        },
    };
}
