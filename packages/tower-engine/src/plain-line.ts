const forbiddenLineCharacters = /[\p{Cc}\p{Cf}]/u;

export function assertPlainLine(value: string, maximum: number): string {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 1 || length > maximum || forbiddenLineCharacters.test(normalized)) {
    throw new Error("Text is invalid.");
  }
  return normalized;
}
