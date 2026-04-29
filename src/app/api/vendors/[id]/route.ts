import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vendorSchema } from "@/lib/validators";
import { handleApiError, requireAdmin, requireAuth } from "@/lib/auth-utils";
import { diffChanges, logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vendor);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = vendorSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const before = await prisma.vendor.findUnique({ where: { id } });
    if (!before)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const next = { ...parsed.data, email: parsed.data.email || null };
    const vendor = await prisma.vendor.update({
      where: { id },
      data: next,
    });

    const changes = diffChanges(
      before as unknown as Record<string, unknown>,
      next as Record<string, unknown>
    );
    await logAudit({
      session,
      action: "UPDATE",
      entity: "VENDOR",
      entityId: vendor.id,
      summary: `외주처 '${vendor.name}' 수정 (${
        Object.keys(changes).join(", ") || "변경 없음"
      })`,
      changes,
    });

    return NextResponse.json(vendor);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const before = await prisma.vendor.findUnique({ where: { id } });
    if (!before)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.vendor.delete({ where: { id } });
    await logAudit({
      session,
      action: "DELETE",
      entity: "VENDOR",
      entityId: id,
      summary: `외주처 '${before.name}' 삭제`,
      changes: before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
