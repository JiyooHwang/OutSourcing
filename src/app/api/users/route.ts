import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAdmin } from "@/lib/auth-utils";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (e) {
    return handleApiError(e);
  }
}
