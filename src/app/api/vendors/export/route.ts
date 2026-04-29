import { prisma } from "@/lib/prisma";
import { csvResponse, toCsv } from "@/lib/csv";
import { handleApiError, requireAuth } from "@/lib/auth-utils";

export async function GET() {
  try {
    await requireAuth();
    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { payments: true } } },
    });

    const headers = [
      "외주처명",
      "분류",
      "담당자",
      "연락처",
      "이메일",
      "사업자등록번호",
      "은행",
      "계좌번호",
      "주소",
      "메모",
      "외주비 건수",
      "등록일",
    ];

    const rows = vendors.map((v) => [
      v.name,
      v.category ?? "",
      v.contactPerson ?? "",
      v.phone ?? "",
      v.email ?? "",
      v.businessNumber ?? "",
      v.bankName ?? "",
      v.bankAccount ?? "",
      v.address ?? "",
      v.notes ?? "",
      v._count.payments,
      v.createdAt.toISOString().slice(0, 10),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    return csvResponse(`vendors_${today}.csv`, toCsv(headers, rows));
  } catch (e) {
    return handleApiError(e);
  }
}
