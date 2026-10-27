const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      ALLOWED_PROTOCOLS.has(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function getSafeImageUrl(value: unknown): string | null {
  return typeof value === "string" && isSafeImageUrl(value) ? value : null;
}
