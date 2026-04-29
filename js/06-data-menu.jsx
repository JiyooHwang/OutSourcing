// =============================================================
// 데이터 메뉴 (백업 / 복원 / 초기화)
// =============================================================

function DataMenu({ data, setData }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outsourcing_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.vendors || !parsed.payments) {
        alert("올바른 형식의 백업 파일이 아닙니다.");
        return;
      }
      if (!confirm("현재 데이터를 백업으로 덮어쓰시겠습니까?")) return;
      setData({
        vendors: parsed.vendors,
        payments: parsed.payments.map(migratePayment),
      });
      setOpen(false);
    } catch (err) {
      alert("불러오기 실패: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function resetAll() {
    if (!confirm("정말 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setData({ vendors: [], payments: [] });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md"
      >
        데이터 ▾
      </button>
      {open && (
        <Fragment>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-20">
            <MenuItem onClick={exportJson}>JSON 백업 내보내기</MenuItem>
            <MenuItem onClick={() => fileRef.current?.click()}>JSON 백업 불러오기</MenuItem>
            <div className="border-t border-slate-100 my-1" />
            <MenuItem onClick={resetAll} danger>전체 초기화</MenuItem>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importJson}
          />
        </Fragment>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 " +
        (danger ? "text-red-600" : "text-slate-700")
      }
    >
      {children}
    </button>
  );
}
