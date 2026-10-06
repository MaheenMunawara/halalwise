export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsSearchText(
  value: unknown,
  query: string
) {
  if (typeof value !== "string") {
    return false;
  }

  return normalizeSearchText(value).includes(
    normalizeSearchText(query)
  );
}