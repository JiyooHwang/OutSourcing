import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/auth-utils";
import { presignGetUrl } from "@/lib/s3";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = await presignGetUrl(attachment.storageKey, attachment.fileName);
    return NextResponse.redirect(url, 302);
  } catch (e) {
    return handleApiError(e);
  }
}
