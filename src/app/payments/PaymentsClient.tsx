"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDate, toDateInput } from "@/lib/format";
import AttachmentsModal from "@/components/AttachmentsModal";

type Status = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";

type Payment = {
  id: string;
  vendorId: string;
  vendor: { id: string; name: string };
  projectName: string;
  description: string | null;
  amount: string;
  currency: string;
  status: Status;
  invoiceDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  notes: string | null;
  _count?: { attachments: number };
};

type Vendor = { id: string; name: string };

type FormState = {
  vendorId: string;
  projectName: string;
  description: string;
  amount: string;
  currency: string;
  status: Status;
  invoiceDate: string;
  dueDate: string;
  paidDate: string;
  notes: string;
};

const emptyForm: FormState = {
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

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "미지급",
  PAID: "지급완료",
  OVERDUE: "연체",
  CANCELED: "취소",
};

const STATUS_BADGE: Record<Status, string> = {
  PENDING: "badge-pending",
  PAID: "badge-paid",
  OVERDUE: "badge-overdue",
  CANCELED: "badge-canceled",
};

export default function PaymentsClient({
  isAdmin,
  currentUserId,
}: {
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<Payment | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (vendorFilter) params.set("vendorId", vendorFilter);

      const [paymentsRes, vendorsRes] = await Promise.all([
        fetch(`/api/payments?${params.toString()}`),
        fetch(`/api/vendors`),
      ]);
      if (!paymentsRes.ok || !vendorsRes.ok) throw new Error("불러오기 실패");
      setPayments(await paymentsRes.json());
      setVendors(await vendorsRes.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, vendorFilter]);

  const totals = useMemo(() => {
    const t = { pending: 0, paid: 0, overdue: 0 };
    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.status === "PENDING") t.pending += amt;
      if (p.status === "PAID") t.paid += amt;
      if (p.status === "OVERDUE") t.overdue += amt;
    }
    return t;
  }, [payments]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, vendorId: vendors[0]?.id ?? "" });
    setShowForm(true);
  }

  function openEdit(p: Payment) {
    setEditing(p);
    setForm({
      vendorId: p.vendorId,
      projectName: p.projectName,
      description: p.description ?? "",
      amount: String(p.amount),
      currency: p.currency,
      status: p.status,
      invoiceDate: toDateInput(p.invoiceDate),
      dueDate: toDateInput(p.dueDate),
      paidDate: toDateInput(p.paidDate),
      notes: p.notes ?? "",
    });
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/payments/${editing.id}` : `/api/payments`;
    const method = editing ? "PATCH" : "POST";
    const body = {
      ...form,
      amount: Number(form.amount || 0),
      invoiceDate: form.invoiceDate || null,
      dueDate: form.dueDate || null,
      paidDate: form.paidDate || null,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("저장 실패: " + JSON.stringify(data));
      return;
    }
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function onDelete(p: Payment) {
    if (!confirm(`'${p.projectName}' 외주비 항목을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    load();
  }

  async function markPaid(p: Payment) {
    const res = await fetch(`/api/payments/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: p.vendorId,
        projectName: p.projectName,
        amount: Number(p.amount),
        currency: p.currency,
        status: "PAID",
        paidDate: new Date().toISOString().slice(0, 10),
      }),
    });
    if (!res.ok) {
      alert("처리 실패");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">외주비 관리</h1>
          <p className="text-slate-600 mt-1">
            프로젝트별 외주비 지급 상태를 추적합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            className="btn-secondary"
            href={`/api/payments/export${
              statusFilter || vendorFilter
                ? `?${new URLSearchParams({
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(vendorFilter ? { vendorId: vendorFilter } : {}),
                  }).toString()}`
                : ""
            }`}
            download
          >
            CSV 내보내기
          </a>
          <button
            className="btn-primary"
            onClick={openCreate}
            disabled={vendors.length === 0}
            title={
              vendors.length === 0 ? "먼저 외주처를 등록해주세요." : ""
            }
          >
            + 외주비 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">미지급 합계 (필터 기준)</div>
          <div className="text-xl font-bold mt-1 text-amber-700">
            {formatCurrency(totals.pending)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">지급완료 합계</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">
            {formatCurrency(totals.paid)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">연체 합계</div>
          <div className="text-xl font-bold mt-1 text-red-700">
            {formatCurrency(totals.overdue)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="select max-w-xs"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        >
          <option value="">전체 외주처</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          className="select max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | Status)}
        >
          <option value="">전체 상태</option>
          <option value="PENDING">미지급</option>
          <option value="PAID">지급완료</option>
          <option value="OVERDUE">연체</option>
          <option value="CANCELED">취소</option>
        </select>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>외주처</th>
              <th>프로젝트</th>
              <th className="text-right">금액</th>
              <th>상태</th>
              <th>청구일</th>
              <th>지급기한</th>
              <th>지급일</th>
              <th>첨부</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-500 py-6">
                  불러오는 중...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-500 py-6">
                  등록된 외주비 항목이 없습니다.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.vendor.name}</td>
                  <td>{p.projectName}</td>
                  <td className="text-right">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td>
                    <span className={STATUS_BADGE[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td>{formatDate(p.invoiceDate)}</td>
                  <td>{formatDate(p.dueDate)}</td>
                  <td>{formatDate(p.paidDate)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-sm text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
                      onClick={() => setAttachmentsFor(p)}
                    >
                      📎 {p._count?.attachments ?? 0}
                    </button>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {p.status !== "PAID" && (
                      <button
                        className="btn-secondary mr-2"
                        onClick={() => markPaid(p)}
                      >
                        지급완료
                      </button>
                    )}
                    <button
                      className="btn-secondary mr-2"
                      onClick={() => openEdit(p)}
                    >
                      편집
                    </button>
                    {isAdmin && (
                      <button
                        className="btn-danger"
                        onClick={() => onDelete(p)}
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editing ? "외주비 편집" : "외주비 추가"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="외주처 *">
                  <select
                    className="select"
                    required
                    value={form.vendorId}
                    onChange={(e) =>
                      setForm({ ...form, vendorId: e.target.value })
                    }
                  >
                    <option value="">선택</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="프로젝트명 *">
                  <input
                    className="input"
                    required
                    value={form.projectName}
                    onChange={(e) =>
                      setForm({ ...form, projectName: e.target.value })
                    }
                  />
                </Field>
                <Field label="금액 *">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </Field>
                <Field label="통화">
                  <select
                    className="select"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="JPY">JPY</option>
                    <option value="CNY">CNY</option>
                  </select>
                </Field>
                <Field label="상태">
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as Status })
                    }
                  >
                    <option value="PENDING">미지급</option>
                    <option value="PAID">지급완료</option>
                    <option value="OVERDUE">연체</option>
                    <option value="CANCELED">취소</option>
                  </select>
                </Field>
                <Field label="청구일">
                  <input
                    type="date"
                    className="input"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm({ ...form, invoiceDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="지급기한">
                  <input
                    type="date"
                    className="input"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="지급일">
                  <input
                    type="date"
                    className="input"
                    value={form.paidDate}
                    onChange={(e) =>
                      setForm({ ...form, paidDate: e.target.value })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="설명">
                    <input
                      className="input"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="메모">
                    <textarea
                      className="textarea"
                      rows={3}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {editing ? "저장" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attachmentsFor && (
        <AttachmentsModal
          paymentId={attachmentsFor.id}
          paymentLabel={`${attachmentsFor.vendor.name} · ${attachmentsFor.projectName}`}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setAttachmentsFor(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
