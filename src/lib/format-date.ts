import { APP } from "@/config/constants";

export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A data informada é inválida.");
  }

  return new Intl.DateTimeFormat(APP.locale, {
    dateStyle: "short",
    timeZone: APP.timeZone,
    ...options,
  }).format(date);
}
