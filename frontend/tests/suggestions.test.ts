import { describe, expect, test } from "vitest";
import { validateSuggestions } from "../lib/server/activity-suggestions";
import { suggestionInput, suggestionProposal } from "../lib/suggestions";
const sources = [
  {
    title: "Museum",
    url: "https://example.org/museum",
    content: "Museum entry",
  },
];
const item = {
  name: "Museum visit",
  description: "Explore exhibits",
  location: "Boston",
  estimatedCostMinor: 2000,
  durationMinutes: 90,
  sourceIndex: 0,
};
describe("activity suggestion validation", () => {
  test("attaches retrieved sources and preserves attribution on acceptance", () => {
    const { suggestions } = validateSuggestions(
      { suggestions: [item] },
      sources,
      [],
      null,
    );
    expect(suggestions[0].sourceUrl).toBe(sources[0].url);
    const proposal = suggestionProposal(suggestions[0]);
    expect(proposal.description).toContain(sources[0].url);
    expect(proposal.description).toContain("unverified");
    expect(proposal.description.length).toBeLessThanOrEqual(2000);
    expect(proposal.estimatedCostMinor).toBe(2000);
  });
  test("filters duplicate names and explicit cost caps including zero", () => {
    const output = {
      suggestions: [
        item,
        { ...item, name: "  MUSEUM   visit " },
        { ...item, name: "Free park", estimatedCostMinor: 0 },
        { ...item, name: "Unknown cost", estimatedCostMinor: null },
      ],
    };
    expect(
      validateSuggestions(output, sources, [], null).suggestions,
    ).toHaveLength(3);
    expect(
      validateSuggestions(output, sources, ["MUSEUM VISIT"], null).suggestions,
    ).toHaveLength(2);
    expect(
      validateSuggestions(output, sources, [], 0).suggestions.map(
        (s) => s.name,
      ),
    ).toEqual(["Free park"]);
    expect(
      validateSuggestions({ suggestions: [] }, [], [], null).suggestions,
    ).toEqual([]);
  });
  test("rejects malformed output and invented or unsafe sources", () => {
    for (const changed of [
      { estimatedCostMinor: -1 },
      { sourceIndex: 7 },
      { name: "" },
      { sourceUrl: "https://invented.example" },
      { durationMinutes: 0 },
    ])
      expect(() =>
        validateSuggestions(
          { suggestions: [{ ...item, ...changed }] },
          sources,
          [],
          null,
        ),
      ).toThrow();
    expect(() =>
      validateSuggestions(
        { suggestions: [item] },
        [{ ...sources[0], url: "javascript:alert(1)" }],
        [],
        null,
      ),
    ).toThrow();
    expect(() =>
      validateSuggestions(
        { suggestions: Array(6).fill(item) },
        sources,
        [],
        null,
      ),
    ).toThrow();
  });
  test("bounds input and refuses model-controlled identity/context", () => {
    expect(suggestionInput.parse({})).toEqual({
      preferences: "",
      maxCostMinor: null,
    });
    for (const input of [
      { preferences: "x".repeat(601) },
      { maxCostMinor: -1 },
      { maxCostMinor: 1.5 },
      { userId: "another-user" },
      { destination: "override" },
    ])
      expect(() => suggestionInput.parse(input)).toThrow();
  });
});
