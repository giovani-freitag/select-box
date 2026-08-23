/**
 * Publishes the last committed value into the page.
 *
 * The specs read `#last-change` instead of hooking framework-specific event
 * plumbing, so one assertion covers `onChange`, emits, DOM events and the
 * jQuery trigger alike.
 *
 * @param value - Whatever the wrapper just committed.
 */
export function reportChange(value: unknown): void {
    const output = document.querySelector("#last-change");
    if (output) output.textContent = JSON.stringify(value);
}
