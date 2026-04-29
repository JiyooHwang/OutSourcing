import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvResponse, toCsv } from "@/lib/csv";
import { handleApiError, requireAuth } from "@/lib/auth-utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "미지급",
  PAID: "지급완료",
  OVERDUE: "연체",
  CANCELED: "취소",
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
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
      include: { vendor: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    const headers = [
      "외주처",
      "프로젝트",
      "설명",
      "금액",
      "통화",
      "상태",
      "청구일",
      "지급기한",
      "지급일",
      "메모",
      "등록일",
    ];

    const rows = payments.map((p) => [
      p.vendor.name,
      p.projectName,
      p.description ?? "",
      p.amount.toString(),
      p.currency,
      STATUS_LABEL[p.status] ?? p.status,
      p.invoiceDate ? p.invoiceDate.toISOString().slice(0, 10) : "",
      p.dueDate ? p.dueDate.toISOString().slice(0, 10) : "",
      p.paidDate ? p.paidDate.toISOString().slice(0, 10) : "",
      p.notes ?? "",
      p.createdAt.toISOString().slice(0, 10),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    return csvResponse(`payments_${today}.csv`, toCsv(headers, rows));
  } catch (e) {
    return handleApiError(e);
  }
}
