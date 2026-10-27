export const ALLOWED_IMAGE_HOSTS = [
  "cdn.sanity.io",
  "images.unsplash.com",
  "plus.unsplash.com",
  "images.pexels.com",
  "avatars.githubusercontent.com",
  "user-images.githubusercontent.com",
  "raw.githubusercontent.com",
  "github.com",
  "res.cloudinary.com",
  "i.imgur.com",
  "imgur.com",
  "media.licdn.com",
  "pbs.twimg.com",
  "lh3.googleusercontent.com",
] as const;

const allowedHosts = new Set<string>(ALLOWED_IMAGE_HOSTS);

export function isAllowedImageHost(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      allowedHosts.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function getSafeImageUrl(value: unknown): string | null {
  return typeof value === "string" && isAllowedImageHost(value) ? value : null;
}
