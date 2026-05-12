import { describe, expect, test } from "vitest";

import { TextHighlighter } from "../src/text-highlighter.js";

describe("TextHighlighter.split", () => {
    test("returns an empty array for an empty string", () => {
        expect(TextHighlighter.split("", [])).toEqual([]);
    });

    test("returns a single unmatched chunk when there are no ranges", () => {
        expect(TextHighlighter.split("Apple", [])).toEqual([{ text: "Apple", matched: false }]);
    });

    test("splits around a single range in the middle of the text", () => {
        const chunks = TextHighlighter.split("Pineapple", [{ start: 4, end: 9 }]);

        expect(chunks).toEqual([
            { text: "Pine", matched: false },
            { text: "apple", matched: true },
        ]);
    });

    test("alternates plain and matched chunks for multiple ranges", () => {
        const chunks = TextHighlighter.split("red apple", [
            { start: 0, end: 3 },
            { start: 4, end: 5 },
        ]);

        expect(chunks).toEqual([
            { text: "red", matched: true },
            { text: " ", matched: false },
            { text: "a", matched: true },
            { text: "pple", matched: false },
        ]);
    });

    test("merges overlapping ranges into a single matched chunk", () => {
        const chunks = TextHighlighter.split("Apple", [
            { start: 0, end: 3 },
            { start: 2, end: 5 },
        ]);

        expect(chunks).toEqual([{ text: "Apple", matched: true }]);
    });

    test("drops zero-length and out-of-bounds ranges", () => {
        const chunks = TextHighlighter.split("Apple", [
            { start: 2, end: 2 },
            { start: -3, end: 1 },
            { start: 6, end: 9 },
        ]);

        expect(chunks).toEqual([
            { text: "A", matched: true },
            { text: "pple", matched: false },
        ]);
    });
});
