import { describe, expect, test } from "vitest";

import { Store } from "../src/store.js";

interface CounterState {
    readonly count: number;
}

describe("Store", () => {
    test("getState returns the initial state from config", () => {
        const initial: CounterState = { count: 0 };

        const store = new Store<CounterState>({ initialState: initial });

        expect(store.getState()).toBe(initial);
    });

    test("setState replaces the snapshot and notifies subscribers", () => {
        const store = new Store<CounterState>({ initialState: { count: 0 } });
        const seen: number[] = [];
        store.subscribe(() => seen.push(store.getState().count));

        store.setState({ count: 1 });
        store.setState({ count: 2 });

        expect(store.getState().count).toBe(2);
        expect(seen).toEqual([1, 2]);
    });

    test("setState skips notification when the next state is referentially equal to the current one", () => {
        const initial: CounterState = { count: 0 };
        const store = new Store<CounterState>({ initialState: initial });
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });

        store.setState(initial);

        expect(notifications).toBe(0);
    });

    test("subscribe returns an unsubscriber that stops further notifications", () => {
        const store = new Store<CounterState>({ initialState: { count: 0 } });
        let notifications = 0;
        const unsubscribe = store.subscribe(() => {
            notifications += 1;
        });

        store.setState({ count: 1 });
        unsubscribe();
        store.setState({ count: 2 });

        expect(notifications).toBe(1);
    });

    test("multiple subscribers all receive notifications", () => {
        const store = new Store<CounterState>({ initialState: { count: 0 } });
        let firstCalls = 0;
        let secondCalls = 0;
        store.subscribe(() => {
            firstCalls += 1;
        });
        store.subscribe(() => {
            secondCalls += 1;
        });

        store.setState({ count: 1 });

        expect(firstCalls).toBe(1);
        expect(secondCalls).toBe(1);
    });

    test("a listener can be removed mid-notification without breaking the loop", () => {
        const store = new Store<CounterState>({ initialState: { count: 0 } });
        let lateCalled = false;
        const unsubscribeEarly = store.subscribe(() => {
            unsubscribeEarly();
        });
        store.subscribe(() => {
            lateCalled = true;
        });

        store.setState({ count: 1 });

        expect(lateCalled).toBe(true);
    });
});
