import {
    SingleSelectBoxController as CoreController,
    type OptionFilterStrategy,
    type SelectBoxSnapshot,
    type SelectOption,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Lit `ReactiveController` adapter for the select-box core; requests a host
 * re-render on every snapshot change.
 */
export class SelectBoxController<TExtra extends object = object> implements ReactiveController {
    private readonly host: ReactiveControllerHost;
    private readonly controller: CoreController<TExtra>;
    private unsubscribe: (() => void) | null = null;

    constructor(host: ReactiveControllerHost, config: SingleSelectBoxControllerConfig<TExtra>) {
        this.host = host;
        this.controller = new CoreController<TExtra>(config);
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

    get state(): SelectBoxSnapshot<TExtra> {
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

    commitOption(option: SelectOption<TExtra>): void {
        this.controller.commitOption(option);
    }

    commitValue(value: string | number | null): void {
        this.controller.commitValue(value);
    }

    setFilter(strategy: OptionFilterStrategy<TExtra>): void {
        this.controller.setFilter(strategy);
    }

    clear(): void {
        this.controller.clear();
    }
}
