import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = paymentSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const payment = await prisma.payment.update({
    where: { id },
    data: {
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
    },
  });
  return NextResponse.json(payment);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
