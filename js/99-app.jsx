// =============================================================
// 메인 App + 마운트
// 이 파일은 마지막에 로드되어야 합니다.
// =============================================================

function App() {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    saveData(data);
  }, [data]);

  const stats = useMemo(() => {
    let pendingAmount = 0, paidAmount = 0;
    let pendingCount = 0, paidCount = 0, overdueCount = 0;
    for (const p of data.payments) {
      for (const inst of p.installments) {
        const amt = Number(inst.amount) || 0;
        if (inst.status === "PENDING")      { pendingAmount += amt; pendingCount++; }
        else if (inst.status === "PAID")    { paidAmount    += amt; paidCount++; }
        else if (inst.status === "OVERDUE") { overdueCount++; }
      }
    }
    return {
      vendorCount: data.vendors.length,
      pendingAmount, pendingCount,
      paidAmount, paidCount,
      overdueCount,
    };
  }, [data]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold">외주업체 관리</h1>
          <nav className="flex gap-1">
            <NavButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
              대시보드
            </NavButton>
            <NavButton active={tab === "vendors"} onClick={() => setTab("vendors")}>
              외주처 목록
            </NavButton>
            <NavButton active={tab === "payments"} onClick={() => setTab("payments")}>
              외주비 관리
            </NavButton>
          </nav>
          <DataMenu data={data} setData={setData} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "dashboard" && <Dashboard stats={stats} onNavigate={setTab} />}
        {tab === "vendors"   && <VendorsView data={data} setData={setData} />}
        {tab === "payments"  && <PaymentsView data={data} setData={setData} />}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-400">
        데이터는 이 브라우저의 localStorage에 저장됩니다. 다른 사람과 공유하려면
        '데이터 → 내보내기'로 JSON을 보내주세요.
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 text-sm font-medium rounded-md transition-colors " +
        (active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:text-slate-900 hover:bg-slate-100")
      }
    >
      {children}
    </button>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
