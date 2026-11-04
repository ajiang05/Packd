"use client";

import { useMemo } from "react";

function buildTzList(): string[] {
  try {
    return (
      Intl as unknown as { supportedValuesOf: (key: string) => string[] }
    ).supportedValuesOf("timeZone");
  } catch {
    return [
      "Africa/Abidjan",
      "Africa/Accra",
      "Africa/Cairo",
      "Africa/Johannesburg",
      "Africa/Lagos",
      "Africa/Nairobi",
      "America/Anchorage",
      "America/Argentina/Buenos_Aires",
      "America/Bogota",
      "America/Chicago",
      "America/Denver",
      "America/Halifax",
      "America/Lima",
      "America/Los_Angeles",
      "America/Mexico_City",
      "America/New_York",
      "America/Phoenix",
      "America/Puerto_Rico",
      "America/Santiago",
      "America/Sao_Paulo",
      "America/Toronto",
      "America/Vancouver",
      "Asia/Bangkok",
      "Asia/Colombo",
      "Asia/Dubai",
      "Asia/Ho_Chi_Minh",
      "Asia/Hong_Kong",
      "Asia/Jakarta",
      "Asia/Karachi",
      "Asia/Kolkata",
      "Asia/Kuala_Lumpur",
      "Asia/Manila",
      "Asia/Riyadh",
      "Asia/Seoul",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Asia/Taipei",
      "Asia/Tehran",
      "Asia/Tokyo",
      "Atlantic/Reykjavik",
      "Australia/Adelaide",
      "Australia/Brisbane",
      "Australia/Melbourne",
      "Australia/Perth",
      "Australia/Sydney",
      "Europe/Amsterdam",
      "Europe/Athens",
      "Europe/Belgrade",
      "Europe/Berlin",
      "Europe/Brussels",
      "Europe/Bucharest",
      "Europe/Budapest",
      "Europe/Copenhagen",
      "Europe/Dublin",
      "Europe/Helsinki",
      "Europe/Istanbul",
      "Europe/Lisbon",
      "Europe/London",
      "Europe/Madrid",
      "Europe/Moscow",
      "Europe/Oslo",
      "Europe/Paris",
      "Europe/Prague",
      "Europe/Rome",
      "Europe/Stockholm",
      "Europe/Vienna",
      "Europe/Warsaw",
      "Europe/Zurich",
      "Pacific/Auckland",
      "Pacific/Fiji",
      "Pacific/Honolulu",
      "UTC",
    ];
  }
}

export default function TimezoneSelector({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const timezones = useMemo(() => buildTzList(), []);

  return (
    <>
      <input
        type="text"
        name={name}
        id={name}
        aria-label="Trip timezone"
        defaultValue={defaultValue}
        list="timezone-options"
        placeholder="e.g. America/New_York"
        required
      />
      <datalist id="timezone-options">
        {timezones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </datalist>
    </>
  );
}
