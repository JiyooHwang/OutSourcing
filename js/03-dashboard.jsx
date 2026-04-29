// =============================================================
// 대시보드
// =============================================================

function Dashboard({ stats, onNavigate }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">대시보드</h2>
        <p className="text-slate-600 mt-1">외주처와 외주비 현황을 한눈에 확인하세요.</p>
      </div>

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
        <ShortcutCard
          title="외주처 목록 →"
          desc="외주 협력업체를 등록하고 연락처/계좌 정보를 관리합니다."
          onClick={() => onNavigate("vendors")}
        />
        <ShortcutCard
          title="외주비 관리 →"
          desc="프로젝트별 외주비 청구 및 지급 상태를 추적합니다."
          onClick={() => onNavigate("payments")}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function ShortcutCard({ title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 text-left hover:shadow-md transition"
    >
      <div className="text-lg font-semibold">{title}</div>
      <p className="text-sm text-slate-600 mt-2">{desc}</p>
    </button>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}
