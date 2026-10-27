import { handlers } from "@/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_LIMIT = 60;
const AUTH_WINDOW_MS = 60 * 1000;

function limitResponse(request: NextRequest) {
  const limit = rateLimit(
    `auth:${getClientIp(request.headers)}`,
    AUTH_LIMIT,
    AUTH_WINDOW_MS
  );

  if (limit.success) {
    return null;
  }

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

export async function GET(request: NextRequest) {
  return limitResponse(request) ?? handlers.GET(request);
}

export async function POST(request: NextRequest) {
  return limitResponse(request) ?? handlers.POST(request);
}
