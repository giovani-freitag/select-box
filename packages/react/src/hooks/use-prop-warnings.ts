import { useRef } from "react";

/**
 * Whether this is a production build.
 *
 * The `typeof` guard is load-bearing: a bundler that replaces
 * `process.env.NODE_ENV` still folds this to a constant, and a browser that
 * never defined `process` gets `false` instead of a `ReferenceError` that would
 * take the whole component down.
 */
function isProduction(): boolean {
    return typeof process !== "undefined" && process.env["NODE_ENV"] === "production";
}

interface PropWarningInput {
    readonly value: unknown;
    readonly defaultValue: unknown;
    readonly onChange: unknown;
    readonly disabled: boolean | undefined;
    readonly readOnly: boolean | undefined;
}

/**
 * Warns, in development only, about prop pairs that fail silently.
 *
 * Both of these typecheck and then do nothing visible, which is the worst way
 * for an API to be wrong. React itself warns for the first on `<select value>`,
 * with the same read-only exemption: a value with no way to answer it is only a
 * mistake when the control was supposed to accept input.
 *
 * @param props - The value-related props as the consumer supplied them.
 */
export function usePropWarnings(props: PropWarningInput): void {
    const warned = useRef(false);

    if (isProduction() || warned.current) return;

    const refusesInput = props.disabled === true || props.readOnly === true;
    if (props.value !== undefined && props.onChange === undefined && !refusesInput) {
        warned.current = true;
        console.warn(
            "[select-box] `value` was supplied without `onChange`, so every pick is " +
                "reverted and the box looks frozen. Pass `onChange` to own the " +
                "selection, `defaultValue` to let the box own it, or `readOnly` if " +
                "the value is meant to be fixed.",
        );
    }

    if (props.value !== undefined && props.defaultValue !== undefined) {
        warned.current = true;
        console.warn(
            "[select-box] `value` and `defaultValue` were both supplied. `value` wins " +
                "and `defaultValue` is ignored — drop whichever one you did not mean.",
        );
    }
}
