import { Temporal } from "@js-temporal/polyfill";

export function toInstant(local: string, timezone: string): string {
  try {
    return Temporal.PlainDateTime.from(local)
      .toZonedDateTime(timezone, { disambiguation: "reject" })
      .toInstant()
      .toString();
  } catch {
    throw new Error(
      "This time is invalid or ambiguous in the trip timezone. Choose a time outside the daylight-saving clock change.",
    );
  }
}
export function toLocal(instant: string, timezone: string): string {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(timezone)
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}
