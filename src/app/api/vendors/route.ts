import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vendorSchema } from "@/lib/validators";
import { handleApiError, requireAuth } from "@/lib/auth-utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const vendors = await prisma.vendor.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { contactPerson: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { payments: true } },
    },
  });
  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const parsed = vendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const vendor = await prisma.vendor.create({
      data: { ...data, email: data.email || null },
    });
    await logAudit({
      session,
      action: "CREATE",
      entity: "VENDOR",
      entityId: vendor.id,
      summary: `외주처 '${vendor.name}' 등록`,
      changes: data,
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
