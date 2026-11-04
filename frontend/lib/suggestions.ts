import { z } from "zod";

export const suggestionInput = z
  .object({
    preferences: z.string().trim().max(600).default(""),
    maxCostMinor: z
      .number()
      .int()
      .min(0)
      .max(2_000_000_000)
      .nullable()
      .default(null),
  })
  .strict();

// The model selects a retrieved source by index; URLs never come from the model.
export const generatedSuggestions = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(160),
            description: z.string().trim().min(1).max(1000),
            location: z.string().trim().min(1).max(300),
            estimatedCostMinor: z
              .number()
              .int()
              .min(0)
              .max(2_000_000_000)
              .nullable(),
            durationMinutes: z.number().int().min(1).max(1440).nullable(),
            sourceIndex: z.number().int().min(0).max(7),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

export type ActivitySuggestion = Omit<
  z.infer<typeof generatedSuggestions>["suggestions"][number],
  "sourceIndex"
> & {
  sourceUrl: string;
  sourceTitle: string;
};
export type SuggestionResponse = { suggestions: ActivitySuggestion[] };

export function suggestionProposal(item: ActivitySuggestion) {
  return {
    name: item.name,
    description: `${item.description}\n\nAI suggestion; price and availability are unverified.${item.durationMinutes ? ` Estimated duration: ${item.durationMinutes} minutes.` : ""}\nSource: ${item.sourceUrl}`,
    location: item.location,
    estimatedCostMinor: item.estimatedCostMinor,
  };
}
