import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/auth-utils";
import { MAX_UPLOAD_BYTES } from "@/lib/s3";

const registerSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const attachments = await prisma.attachment.findMany({
      where: { paymentId: id },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(attachments);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { error: "외주비 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachment.create({
      data: {
        paymentId: id,
        fileName: parsed.data.fileName,
        fileSize: parsed.data.fileSize,
        mimeType: parsed.data.mimeType,
        storageKey: parsed.data.storageKey,
        uploadedById: session.user.id,
      },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
