let counter = 0;

/**
 * Mints a document-unique prefix for one select box's element ids.
 *
 * `aria-activedescendant` can only point at an id, so every rendered row needs
 * one, and two instances on a page must not collide. Frameworks with their own
 * id hook (React's and Vue's `useId`) should use that instead — it survives
 * server rendering, which a module counter cannot.
 *
 * @returns A fresh prefix, e.g. `select-box-3`.
 */
export function nextSelectBoxId(): string {
    counter += 1;
    return `select-box-${counter}`;
}

/**
 * The element id for one option row.
 *
 * Keyed by the option's value rather than its position: the combobox and the
 * rows sit in different components, and both can derive this from the same
 * snapshot without the row index having to travel between them. Values are
 * percent-encoded so a label-shaped value cannot produce whitespace in an id.
 *
 * @param instanceId - Prefix from `nextSelectBoxId` or a framework id hook.
 * @param optionValue - The option's canonical value.
 */
export function optionElementId(instanceId: string, optionValue: string): string {
    return `${instanceId}-opt-${encodeURIComponent(optionValue)}`;
}
