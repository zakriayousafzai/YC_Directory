"use server";

import { auth } from "@/auth";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import type { ActionState, FormField } from "./action-state";
import { rateLimit } from "./rate-limit";
import { formSchema } from "./validation";

const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 10 * 60 * 1000;

function getFormString(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === "string" ? value : "";
}

export const createPitch = async (
  _prevState: ActionState,
  form: FormData
): Promise<ActionState> => {
  const session = await auth();

  if (!session?.id) {
    return {
      error: "Please sign in to submit a startup.",
      status: "ERROR",
    };
  }

  const limit = rateLimit(
    `createPitch:${session.id}`,
    CREATE_LIMIT,
    CREATE_WINDOW_MS
  );

  if (!limit.success) {
    return {
      error: "Too many submissions. Please try again later.",
      status: "ERROR",
    };
  }

  const parsed = await formSchema.safeParseAsync({
    title: getFormString(form, "title"),
    description: getFormString(form, "description"),
    category: getFormString(form, "category"),
    link: getFormString(form, "link"),
    pitch: getFormString(form, "pitch"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Partial<
      Record<FormField, string[]>
    >;

    return {
      error: "Please check your inputs and try again.",
      status: "ERROR",
      fieldErrors,
    };
  }

  const { title, description, category, link, pitch } = parsed.data;
  const slug = slugify(title, { lower: true, strict: true });

  if (!slug) {
    return {
      error: "The title must contain letters or numbers.",
      status: "ERROR",
    };
  }

  try {
    const result = await writeClient.create({
      _type: "startup",
      title,
      description,
      category,
      image: link,
      slug: {
        _type: "slug",
        current: slug,
      },
      author: {
        _type: "reference",
        _ref: session.id,
      },
      pitch,
      views: 0,
    });

    return {
      _id: result._id,
      error: "",
      status: "SUCCESS",
    };
  } catch (error) {
    console.error("createPitch failed", {
      authorId: session.id,
      error,
    });

    return {
      error: "Could not create your startup. Please try again.",
      status: "ERROR",
    };
  }
};
