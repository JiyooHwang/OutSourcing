import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAdmin } from "@/lib/auth-utils";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (id === session.user.id && parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "본인의 관리자 권한은 해제할 수 없습니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, role: true, email: true, name: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "본인 계정은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
