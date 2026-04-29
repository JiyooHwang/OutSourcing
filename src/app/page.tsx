import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [vendorCount, pendingAgg, paidAgg, overdueCount] = await Promise.all([
      prisma.vendor.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: "PENDING" },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: "PAID" },
      }),
      prisma.payment.count({ where: { status: "OVERDUE" } }),
    ]);
    return {
      vendorCount,
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      pendingCount: pendingAgg._count,
      paidAmount: Number(paidAgg._sum.amount ?? 0),
      paidCount: paidAgg._count,
      overdueCount,
      error: null as string | null,
    };
  } catch (e) {
    return {
      vendorCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      paidAmount: 0,
      paidCount: 0,
      overdueCount: 0,
      error:
        "데이터베이스 연결에 실패했습니다. .env의 DATABASE_URL을 확인하고 `npm run db:push`를 실행해주세요.",
    };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-slate-600 mt-1">
          외주처와 외주비 현황을 한눈에 확인하세요.
        </p>
      </div>

      {stats.error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-800 text-sm">
          {stats.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="등록 외주처" value={`${stats.vendorCount}개`} />
        <StatCard
          label="미지급 외주비"
          value={formatCurrency(stats.pendingAmount)}
          sub={`${stats.pendingCount}건`}
          tone="amber"
        />
        <StatCard
          label="지급 완료"
          value={formatCurrency(stats.paidAmount)}
          sub={`${stats.paidCount}건`}
          tone="emerald"
        />
        <StatCard
          label="연체"
          value={`${stats.overdueCount}건`}
          tone={stats.overdueCount > 0 ? "red" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/vendors" className="card p-6 hover:shadow-md transition">
          <div className="text-sm text-slate-500">바로가기</div>
          <div className="text-lg font-semibold mt-1">외주처 목록 →</div>
          <p className="text-sm text-slate-600 mt-2">
            외주 협력업체를 등록하고 연락처/계좌 정보를 관리합니다.
          </p>
        </Link>
        <Link href="/payments" className="card p-6 hover:shadow-md transition">
          <div className="text-sm text-slate-500">바로가기</div>
          <div className="text-lg font-semibold mt-1">외주비 관리 →</div>
          <p className="text-sm text-slate-600 mt-2">
            프로젝트별 외주비 청구 및 지급 상태를 추적합니다.
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "amber" | "emerald" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-900";
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
