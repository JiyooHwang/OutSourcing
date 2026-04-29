import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const vendorId = sp.get("vendorId") || undefined;
  const status = sp.get("status") || undefined;

  const payments = await prisma.payment.findMany({
    where: {
      vendorId,
      status: status as
        | "PENDING"
        | "PAID"
        | "OVERDUE"
        | "CANCELED"
        | undefined,
    },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const payment = await prisma.payment.create({
    data: {
      vendorId: d.vendorId,
      projectName: d.projectName,
      description: d.description || null,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      invoiceDate: d.invoiceDate ? new Date(d.invoiceDate) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      paidDate: d.paidDate ? new Date(d.paidDate) : null,
      notes: d.notes || null,
    },
  });
  return NextResponse.json(payment, { status: 201 });
}
