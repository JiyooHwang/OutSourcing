import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireAuth } from "@/lib/auth-utils";
import { deleteObject } from "@/lib/s3";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = attachment.uploadedById === session.user.id;
    if (!isAdmin && !isOwner) {
      throw new ApiError(
        403,
        "본인이 업로드한 파일이거나 관리자만 삭제할 수 있습니다."
      );
    }

    try {
      await deleteObject(attachment.storageKey);
    } catch (e) {
      console.error("S3 객체 삭제 실패:", e);
    }
    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
