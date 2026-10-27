import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";

const VIEW_LIMIT = 60;
const VIEW_WINDOW_MS = 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid startup id." }, { status: 400 });
  }

  const limit = rateLimit(
    `views:${getClientIp(request.headers)}`,
    VIEW_LIMIT,
    VIEW_WINDOW_MS
  );

  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  const exists = await client.fetch<string | null>(
    `*[_type == "startup" && _id == $id][0]._id`,
    { id }
  );

  if (!exists) {
    return NextResponse.json({ error: "Startup not found." }, { status: 404 });
  }

  try {
    const updated = (await writeClient
      .patch(id)
      .setIfMissing({ views: 0 })
      .inc({ views: 1 })
      .commit({ returnDocuments: true })) as { views?: number };

    return NextResponse.json({ views: updated.views ?? 0 });
  } catch (error) {
    console.error("view increment failed", { id, error });

    return NextResponse.json(
      { error: "Could not update the view count." },
      { status: 500 }
    );
  }
}
