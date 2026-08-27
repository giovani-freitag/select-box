import {
    SelectBoxController as CoreController,
    type OptionFilterStrategy,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Lit `ReactiveController` adapter for the select-box core; requests a host
 * re-render on every snapshot change. Generic over the value type so single-
 * (`string | null`) and multi-mode (`ReadonlyArray<string>`) hosts both share
 * this one adapter.
 *
 * Named for what Lit calls the pattern, so it does not take the name every
 * other wrapper uses for the core class — which would leave the type of
 * `element.controller` unnameable from this package.
 */
export class SelectBoxReactiveController<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> implements ReactiveController {
    private readonly host: ReactiveControllerHost;
    private readonly controller: CoreController<TExtra, TValue>;
    private unsubscribe: (() => void) | null = null;

    constructor(host: ReactiveControllerHost, config: SelectBoxControllerConfig<TExtra>) {
        this.host = host;
        this.controller = new CoreController<TExtra, TValue>(config);
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

    /** Core controller — exposed so the styled component can wire dispatchers/views. */
    get core(): CoreController<TExtra, TValue> {
        return this.controller;
    }

    get state(): SelectBoxSnapshot<TExtra, TValue> {
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

    commitValue(input: SelectionValueInput): void {
        this.controller.commitValue(input);
    }

    setFilter(strategy: OptionFilterStrategy<TExtra>): void {
        this.controller.setFilter(strategy);
    }

    clear(): void {
        this.controller.clear();
    }
}
