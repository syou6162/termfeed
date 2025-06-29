export function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.error(`Invalid ${fieldName}: must be a positive number`);
    process.exit(1);
  }
  return parsed;
}

export function parseOptionalPositiveInteger(
  value: string | undefined,
  fieldName: string
): number | undefined {
  if (!value) return undefined;
  return parsePositiveInteger(value, fieldName);
}
