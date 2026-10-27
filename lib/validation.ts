import { z } from "zod";
import { isSafeImageUrl } from "./image-url";

export const formSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(20).max(500),
  category: z.string().trim().min(3).max(20),
  link: z
    .string()
    .url()
    .refine(isSafeImageUrl, {
      message: "Enter a valid HTTP(S) image URL.",
    }),
  pitch: z.string().trim().min(20),
});

export type FormValues = z.infer<typeof formSchema>;
