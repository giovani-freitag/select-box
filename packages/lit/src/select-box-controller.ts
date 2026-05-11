import {
    SingleSelectBoxController as CoreController,
    type SelectBoxSnapshot,
    type SelectOption,
    type SingleSelectBoxConfig,
} from "@select-box/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Lit-flavoured wrapper around the framework-agnostic
 * `SingleSelectBoxController`. Implements `ReactiveController` so it
 * plugs into a host `LitElement` and triggers `requestUpdate()` on every
 * snapshot change.
 *
 *     class FruitPicker extends LitElement {
 *         selectBox = new SelectBoxController<Fruit>(this, { options });
 *         render() {
 *             const state = this.selectBox.state;
 *             return html`<button @click=${() => this.selectBox.toggle()}>…</button>`;
 *         }
 *     }
 *
 * Lifecycle is bound to the host element: `hostConnected` opens the
 * subscription; `hostDisconnected` tears it down and destroys the
 * underlying controller so the addon contract is honoured.
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
