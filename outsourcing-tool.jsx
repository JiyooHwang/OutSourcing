const { useState, useEffect, useMemo, useRef } = React;

// =============================================================
// 데이터 저장 (localStorage)
// =============================================================
const STORAGE_KEY = "outsourcing-tool-data-v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { vendors: [], payments: [] };
    const parsed = JSON.parse(raw);
    return {
      vendors: parsed.vendors ?? [],
      payments: parsed.payments ?? [],
    };
  } catch (e) {
    console.error("데이터 로드 실패:", e);
    return { vendors: [], payments: [] };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("데이터 저장 실패:", e);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// =============================================================
// 포맷터
// =============================================================
function formatCurrency(amount, currency = "KRW") {
  const num = Number(amount);
  if (Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(num);
}

function formatDate(date) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// =============================================================
// CSV 내보내기
// =============================================================
function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  const body = "﻿" + lines.join("\r\n"); // BOM for Excel
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================================
// 상수
// =============================================================
const STATUS_LABEL = {
  PENDING: "미지급",
  PAID: "지급완료",
  OVERDUE: "연체",
  CANCELED: "취소",
};

const STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELED: "bg-slate-100 text-slate-600",
};

// =============================================================
// 메인 App
// =============================================================
function App() {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    saveData(data);
  }, [data]);

  const stats = useMemo(() => {
    let pendingAmount = 0;
    let paidAmount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let paidCount = 0;
    for (const p of data.payments) {
      const amt = Number(p.amount) || 0;
      if (p.status === "PENDING") {
        pendingAmount += amt;
        pendingCount++;
      } else if (p.status === "PAID") {
        paidAmount += amt;
        paidCount++;
      } else if (p.status === "OVERDUE") {
        overdueCount++;
      }
    }
    return {
      vendorCount: data.vendors.length,
      pendingAmount,
      pendingCount,
      paidAmount,
      paidCount,
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
        {tab === "dashboard" && (
          <Dashboard stats={stats} onNavigate={setTab} />
        )}
        {tab === "vendors" && (
          <VendorsView data={data} setData={setData} />
        )}
        {tab === "payments" && (
          <PaymentsView data={data} setData={setData} />
        )}
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

// =============================================================
// 데이터 메뉴 (백업/복원/초기화)
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
        payments: parsed.payments,
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
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-20">
            <MenuItem onClick={exportJson}>JSON 백업 내보내기</MenuItem>
            <MenuItem onClick={() => fileRef.current?.click()}>
              JSON 백업 불러오기
            </MenuItem>
            <div className="border-t border-slate-100 my-1" />
            <MenuItem onClick={resetAll} danger>
              전체 초기화
            </MenuItem>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importJson}
          />
        </>
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

// =============================================================
// 외주처 목록
// =============================================================
const EMPTY_VENDOR = {
  name: "",
  category: "",
  contactPerson: "",
  phone: "",
  email: "",
  businessNumber: "",
  bankName: "",
  bankAccount: "",
  address: "",
  notes: "",
};

function VendorsView({ data, setData }) {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.vendors;
    return data.vendors.filter((v) =>
      [v.name, v.contactPerson, v.category]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(term))
    );
  }, [data.vendors, q]);

  const paymentCountByVendor = useMemo(() => {
    const map = {};
    for (const p of data.payments) {
      map[p.vendorId] = (map[p.vendorId] || 0) + 1;
    }
    return map;
  }, [data.payments]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(v) {
    setEditing(v);
    setShowForm(true);
  }

  function saveVendor(form) {
    if (editing) {
      setData({
        ...data,
        vendors: data.vendors.map((v) =>
          v.id === editing.id ? { ...v, ...form } : v
        ),
      });
    } else {
      setData({
        ...data,
        vendors: [
          { id: uid(), createdAt: new Date().toISOString(), ...form },
          ...data.vendors,
        ],
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  function deleteVendor(v) {
    const count = paymentCountByVendor[v.id] || 0;
    const msg =
      count > 0
        ? `'${v.name}' 외주처를 삭제하시겠습니까? 관련 외주비 ${count}건도 함께 삭제됩니다.`
        : `'${v.name}' 외주처를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    setData({
      vendors: data.vendors.filter((x) => x.id !== v.id),
      payments: data.payments.filter((p) => p.vendorId !== v.id),
    });
  }

  function exportCsv() {
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
    const rows = filtered.map((v) => [
      v.name,
      v.category,
      v.contactPerson,
      v.phone,
      v.email,
      v.businessNumber,
      v.bankName,
      v.bankAccount,
      v.address,
      v.notes,
      paymentCountByVendor[v.id] || 0,
      v.createdAt ? v.createdAt.slice(0, 10) : "",
    ]);
    downloadCsv(
      `vendors_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">외주처 목록</h2>
          <p className="text-slate-600 mt-1">외주 협력업체 정보를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportCsv}>
            CSV 내보내기
          </Btn>
          <Btn onClick={openCreate}>+ 외주처 추가</Btn>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          className="max-w-xs"
          placeholder="외주처명 / 담당자 / 분류 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>외주처명</Th>
              <Th>담당자</Th>
              <Th>연락처</Th>
              <Th>이메일</Th>
              <Th>분류</Th>
              <Th>외주비 건수</Th>
              <Th align="right">관리</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  {data.vendors.length === 0
                    ? "등록된 외주처가 없습니다. '+ 외주처 추가' 버튼을 눌러주세요."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <Td bold>{v.name}</Td>
                  <Td>{v.contactPerson || "-"}</Td>
                  <Td>{v.phone || "-"}</Td>
                  <Td>{v.email || "-"}</Td>
                  <Td>{v.category || "-"}</Td>
                  <Td>{paymentCountByVendor[v.id] || 0}</Td>
                  <Td align="right">
                    <Btn variant="secondary" small onClick={() => openEdit(v)}>
                      편집
                    </Btn>
                    <span className="ml-2">
                      <Btn variant="danger" small onClick={() => deleteVendor(v)}>
                        삭제
                      </Btn>
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <VendorForm
          initial={editing || EMPTY_VENDOR}
          isEdit={!!editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={saveVendor}
        />
      )}
    </div>
  );
}

function VendorForm({ initial, isEdit, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_VENDOR, ...initial }));

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("외주처명은 필수입니다.");
      return;
    }
    onSave(form);
  }

  return (
    <Modal title={isEdit ? "외주처 편집" : "외주처 추가"} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="외주처명 *">
            <Input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="분류">
            <Input
              placeholder="예: 디자인, 개발, 번역"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            />
          </Field>
          <Field label="담당자">
            <Input
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
            />
          </Field>
          <Field label="연락처">
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="이메일">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="사업자등록번호">
            <Input
              value={form.businessNumber}
              onChange={(e) => update("businessNumber", e.target.value)}
            />
          </Field>
          <Field label="은행">
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
            />
          </Field>
          <Field label="계좌번호">
            <Input
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value)}
            />
          </Field>
          <Field label="주소" full>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <Field label="메모" full>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" type="button" onClick={onCancel}>
            취소
          </Btn>
          <Btn type="submit">{isEdit ? "저장" : "등록"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================
// 외주비 관리
// =============================================================
const EMPTY_PAYMENT = {
  vendorId: "",
  projectName: "",
  description: "",
  amount: "",
  currency: "KRW",
  status: "PENDING",
  invoiceDate: "",
  dueDate: "",
  paidDate: "",
  notes: "",
};

function PaymentsView({ data, setData }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const vendorById = useMemo(() => {
    const map = {};
    for (const v of data.vendors) map[v.id] = v;
    return map;
  }, [data.vendors]);

  const filtered = useMemo(() => {
    return data.payments
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => !vendorFilter || p.vendorId === vendorFilter)
      .slice()
      .sort((a, b) => {
        const da = a.dueDate || "9999";
        const db = b.dueDate || "9999";
        if (da !== db) return da.localeCompare(db);
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }, [data.payments, statusFilter, vendorFilter]);

  const totals = useMemo(() => {
    const t = { pending: 0, paid: 0, overdue: 0 };
    for (const p of filtered) {
      const amt = Number(p.amount) || 0;
      if (p.status === "PENDING") t.pending += amt;
      if (p.status === "PAID") t.paid += amt;
      if (p.status === "OVERDUE") t.overdue += amt;
    }
    return t;
  }, [filtered]);

  function openCreate() {
    if (data.vendors.length === 0) {
      alert("먼저 외주처를 등록해주세요.");
      return;
    }
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p);
    setShowForm(true);
  }

  function savePayment(form) {
    if (editing) {
      setData({
        ...data,
        payments: data.payments.map((p) =>
          p.id === editing.id ? { ...p, ...form } : p
        ),
      });
    } else {
      setData({
        ...data,
        payments: [
          { id: uid(), createdAt: new Date().toISOString(), ...form },
          ...data.payments,
        ],
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  function deletePayment(p) {
    if (!confirm(`'${p.projectName}' 외주비를 삭제하시겠습니까?`)) return;
    setData({
      ...data,
      payments: data.payments.filter((x) => x.id !== p.id),
    });
  }

  function markPaid(p) {
    setData({
      ...data,
      payments: data.payments.map((x) =>
        x.id === p.id
          ? { ...x, status: "PAID", paidDate: new Date().toISOString().slice(0, 10) }
          : x
      ),
    });
  }

  function exportCsv() {
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
    const rows = filtered.map((p) => [
      vendorById[p.vendorId]?.name || "(삭제됨)",
      p.projectName,
      p.description,
      p.amount,
      p.currency,
      STATUS_LABEL[p.status],
      p.invoiceDate,
      p.dueDate,
      p.paidDate,
      p.notes,
      p.createdAt ? p.createdAt.slice(0, 10) : "",
    ]);
    downloadCsv(
      `payments_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">외주비 관리</h2>
          <p className="text-slate-600 mt-1">
            프로젝트별 외주비 지급 상태를 추적합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportCsv}>
            CSV 내보내기
          </Btn>
          <Btn onClick={openCreate}>+ 외주비 추가</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="미지급 합계 (필터 기준)" value={formatCurrency(totals.pending)} tone="amber" />
        <SummaryCard label="지급완료 합계" value={formatCurrency(totals.paid)} tone="emerald" />
        <SummaryCard label="연체 합계" value={formatCurrency(totals.overdue)} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          className="max-w-xs"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        >
          <option value="">전체 외주처</option>
          {data.vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">전체 상태</option>
          <option value="PENDING">미지급</option>
          <option value="PAID">지급완료</option>
          <option value="OVERDUE">연체</option>
          <option value="CANCELED">취소</option>
        </Select>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>외주처</Th>
              <Th>프로젝트</Th>
              <Th align="right">금액</Th>
              <Th>상태</Th>
              <Th>청구일</Th>
              <Th>지급기한</Th>
              <Th>지급일</Th>
              <Th align="right">관리</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-500 py-6">
                  {data.payments.length === 0
                    ? "등록된 외주비가 없습니다. '+ 외주비 추가' 버튼을 눌러주세요."
                    : "필터에 해당하는 외주비가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td bold>{vendorById[p.vendorId]?.name || "(삭제됨)"}</Td>
                  <Td>{p.projectName}</Td>
                  <Td align="right">{formatCurrency(p.amount, p.currency)}</Td>
                  <Td>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        STATUS_BADGE[p.status]
                      }
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </Td>
                  <Td>{formatDate(p.invoiceDate)}</Td>
                  <Td>{formatDate(p.dueDate)}</Td>
                  <Td>{formatDate(p.paidDate)}</Td>
                  <Td align="right">
                    {p.status !== "PAID" && (
                      <Btn variant="secondary" small onClick={() => markPaid(p)}>
                        지급완료
                      </Btn>
                    )}
                    <span className="ml-2">
                      <Btn variant="secondary" small onClick={() => openEdit(p)}>
                        편집
                      </Btn>
                    </span>
                    <span className="ml-2">
                      <Btn variant="danger" small onClick={() => deletePayment(p)}>
                        삭제
                      </Btn>
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <PaymentForm
          vendors={data.vendors}
          initial={editing || { ...EMPTY_PAYMENT, vendorId: data.vendors[0]?.id || "" }}
          isEdit={!!editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={savePayment}
        />
      )}
    </div>
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

function PaymentForm({ vendors, initial, isEdit, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PAYMENT, ...initial }));

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.vendorId) {
      alert("외주처를 선택해주세요.");
      return;
    }
    if (!form.projectName.trim()) {
      alert("프로젝트명은 필수입니다.");
      return;
    }
    if (form.amount === "" || Number.isNaN(Number(form.amount))) {
      alert("금액을 입력해주세요.");
      return;
    }
    onSave({ ...form, amount: Number(form.amount) });
  }

  return (
    <Modal title={isEdit ? "외주비 편집" : "외주비 추가"} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="외주처 *">
            <Select
              required
              value={form.vendorId}
              onChange={(e) => update("vendorId", e.target.value)}
            >
              <option value="">선택</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="프로젝트명 *">
            <Input
              required
              value={form.projectName}
              onChange={(e) => update("projectName", e.target.value)}
            />
          </Field>
          <Field label="금액 *">
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </Field>
          <Field label="통화">
            <Select
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
            </Select>
          </Field>
          <Field label="상태">
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="PENDING">미지급</option>
              <option value="PAID">지급완료</option>
              <option value="OVERDUE">연체</option>
              <option value="CANCELED">취소</option>
            </Select>
          </Field>
          <Field label="청구일">
            <Input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => update("invoiceDate", e.target.value)}
            />
          </Field>
          <Field label="지급기한">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </Field>
          <Field label="지급일">
            <Input
              type="date"
              value={form.paidDate}
              onChange={(e) => update("paidDate", e.target.value)}
            />
          </Field>
          <Field label="설명" full>
            <Input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <Field label="메모" full>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" type="button" onClick={onCancel}>
            취소
          </Btn>
          <Btn type="submit">{isEdit ? "저장" : "등록"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================
// 공용 UI 컴포넌트
// =============================================================
function Card({ children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

function Table({ children }) {
  return <table className="w-full text-sm">{children}</table>;
}

function Th({ children, align }) {
  return (
    <th
      className={
        "px-3 py-2 font-medium text-slate-600 border-b border-slate-200 bg-slate-50 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      {children}
    </th>
  );
}

function Td({ children, align, bold }) {
  return (
    <td
      className={
        "px-3 py-2 border-b border-slate-100 align-middle " +
        (align === "right" ? "text-right" : "") +
        (bold ? " font-medium" : "")
      }
    >
      {children}
    </td>
  );
}

function Field({ label, full, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    >
      {children}
    </select>
  );
}

function Btn({ children, variant = "primary", small, type = "button", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors";
  const size = small ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm";
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      className={`${base} ${size} ${styles[variant] || styles.primary}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 마운트
// =============================================================
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
