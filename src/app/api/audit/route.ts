import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAdmin } from "@/lib/auth-utils";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const entity = sp.get("entity") || undefined;
    const action = sp.get("action") || undefined;
    const actorId = sp.get("actorId") || undefined;
    const cursor = sp.get("cursor") || undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: entity as
          | "VENDOR"
          | "PAYMENT"
          | "USER"
          | "ATTACHMENT"
          | undefined,
        action: action as "CREATE" | "UPDATE" | "DELETE" | undefined,
        actorId,
      },
      include: {
        actor: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > PAGE_SIZE;
    const items = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ items, nextCursor });
  } catch (e) {
    return handleApiError(e);
  }
}
