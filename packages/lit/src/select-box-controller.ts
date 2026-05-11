import {
    SingleSelectBoxController as CoreController,
    type SelectBoxSnapshot,
    type SelectOption,
    type SingleSelectBoxConfig,
} from "@select-box/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Lit `ReactiveController` adapter for the select-box core; requests a host
 * re-render on every snapshot change.
 */
export class SelectBoxController<TValue> implements ReactiveController {
    private readonly host: ReactiveControllerHost;
    private readonly controller: CoreController<TValue>;
    private unsubscribe: (() => void) | null = null;

    constructor(host: ReactiveControllerHost, config: SingleSelectBoxConfig<TValue>) {
        this.host = host;
        this.controller = new CoreController<TValue>(config);
        host.addController(this);
    }

    hostConnected(): void {
        this.unsubscribe = this.controller.subscribe(() => {
            this.host.requestUpdate();
        });
    }

    hostDisconnected(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.controller.destroy();
    }

    get state(): SelectBoxSnapshot<TValue> {
        return this.controller.getState();
    }

    open(): void {
        this.controller.open();
    }

    close(): void {
        this.controller.close();
    }

    toggle(): void {
        this.controller.toggle();
    }

    setQuery(query: string): void {
        this.controller.setQuery(query);
    }

    moveActive(delta: number): void {
        this.controller.moveActive(delta);
    }

    commitActive(): void {
        this.controller.commitActive();
    }

    commitOption(option: SelectOption<TValue>): void {
        this.controller.commitOption(option);
    }

    clear(): void {
        this.controller.clear();
    }
}
