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

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
