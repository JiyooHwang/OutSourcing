import { NextResponse } from "next/server";
import { auth } from "@/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new ApiError(403, "관리자 권한이 필요합니다.");
  }
  return session;
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
