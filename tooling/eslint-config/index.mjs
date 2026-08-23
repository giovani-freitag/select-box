import eslintJs from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tsEslint from "typescript-eslint";
import globals from "globals";

export default tsEslint.config(
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/coverage/**"],
    },
    eslintJs.configs.recommended,
    ...tsEslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        // A conditional hook or a stale dependency array is a correctness bug the
        // type checker cannot see, so both are errors rather than warnings.
        files: ["**/*.tsx"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
        },
    },
    {
        files: [
            "**/tests/**/*.{ts,tsx}",
            "**/*.{test,spec}.{ts,tsx}",
            "**/specs/**/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
        },
    },
);
