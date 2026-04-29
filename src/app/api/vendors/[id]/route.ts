import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vendorSchema } from "@/lib/validators";
import { handleApiError, requireAdmin } from "@/lib/auth-utils";

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
  const { id } = await params;
  const body = await req.json();
  const parsed = vendorSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const vendor = await prisma.vendor.update({
    where: { id },
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
