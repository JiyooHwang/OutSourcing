import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/auth-utils";
import {
  buildStorageKey,
  isS3Configured,
  MAX_UPLOAD_BYTES,
  presignPutUrl,
} from "@/lib/s3";

const schema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  mimeType: z.string().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    if (!isS3Configured) {
      return NextResponse.json(
        { error: "파일 업로드 저장소가 설정되지 않았습니다." },
        { status: 503 }
      );
    }
    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { error: "외주비 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fileName, fileSize, mimeType } = parsed.data;
    const storageKey = buildStorageKey(id, fileName);
    const uploadUrl = await presignPutUrl(storageKey, mimeType, fileSize);

    return NextResponse.json({ uploadUrl, storageKey });
  } catch (e) {
    return handleApiError(e);
  }
}
