import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators";
import { handleApiError, requireAdmin, requireAuth } from "@/lib/auth-utils";
import { diffChanges, logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = paymentSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const before = await prisma.payment.findUnique({
      where: { id },
      include: { vendor: { select: { name: true } } },
    });
    if (!before)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const next = {
      vendorId: d.vendorId,
      projectName: d.projectName,
      description: d.description ?? undefined,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      invoiceDate: d.invoiceDate ? new Date(d.invoiceDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      paidDate: d.paidDate ? new Date(d.paidDate) : null,
      notes: d.notes ?? undefined,
    };
    const payment = await prisma.payment.update({
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
      entity: "PAYMENT",
      entityId: payment.id,
      summary: `외주비 수정: ${before.vendor.name} · ${payment.projectName} (${
        Object.keys(changes).join(", ") || "변경 없음"
      })`,
      changes,
    });

    return NextResponse.json(payment);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const before = await prisma.payment.findUnique({
      where: { id },
      include: { vendor: { select: { name: true } } },
    });
    if (!before)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.payment.delete({ where: { id } });
    await logAudit({
      session,
      action: "DELETE",
      entity: "PAYMENT",
      entityId: id,
      summary: `외주비 삭제: ${before.vendor.name} · ${before.projectName}`,
      changes: before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
