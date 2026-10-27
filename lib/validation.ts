import { z } from "zod";
import { isAllowedImageHost } from "./image-hosts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function isReachableImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "YC-Directory/1.0 image validation",
      },
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase();

    if (!contentType?.startsWith("image/") || contentType.includes("svg")) {
      return false;
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const formSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(20).max(500),
  category: z.string().trim().min(3).max(20),
  link: z
    .string()
    .url()
    .superRefine(async (url, ctx) => {
      if (!isAllowedImageHost(url)) {
        ctx.addIssue({
          code: "custom",
          message: "Use an image from a supported host.",
        });
        return;
      }

      if (!(await isReachableImage(url))) {
        ctx.addIssue({
          code: "custom",
          message: "The image URL must point to a reachable image.",
        });
      }
    }),
  pitch: z.string().trim().min(20),
});

export type FormValues = z.infer<typeof formSchema>;
