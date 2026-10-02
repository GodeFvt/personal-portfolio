export function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
export function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
