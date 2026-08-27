export type StoreListener = () => void;

export interface StoreConfig<TState> {
    readonly initialState: TState;
}

/**
 * Observer store with referential-equality change detection.
 */
export class Store<TState> {
    private currentState: TState;
    private readonly listeners = new Set<StoreListener>();

    constructor(config: StoreConfig<TState>) {
        this.currentState = config.initialState;
    }

    getState(): TState {
        return this.currentState;
    }

    setState(nextState: TState): void {
        if (Object.is(nextState, this.currentState)) {
            return;
        }
        this.currentState = nextState;
        this.notifyListeners();
    }

    subscribe(listener: StoreListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Drops every listener, so a torn-down owner stops being notified.
     *
     * Without it a consumer who unsubscribes nowhere keeps the store, and
     * everything it closes over, reachable for as long as they hold the handle.
     */
    clearListeners(): void {
        this.listeners.clear();
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
