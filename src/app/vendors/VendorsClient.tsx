"use client";

import { useEffect, useState } from "react";

type Vendor = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  businessNumber: string | null;
  address: string | null;
  category: string | null;
  bankName: string | null;
  bankAccount: string | null;
  notes: string | null;
  _count?: { payments: number };
};

const empty: Omit<Vendor, "id" | "_count"> = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  businessNumber: "",
  address: "",
  category: "",
  bankName: "",
  bankAccount: "",
  notes: "",
};

export default function VendorsClient({ isAdmin }: { isAdmin: boolean }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vendors${q ? `?q=${encodeURIComponent(q)}` : ""}`
      );
      if (!res.ok) throw new Error("불러오기 실패");
      setVendors(await res.json());
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
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setShowForm(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      contactPerson: v.contactPerson ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
      businessNumber: v.businessNumber ?? "",
      address: v.address ?? "",
      category: v.category ?? "",
      bankName: v.bankName ?? "",
      bankAccount: v.bankAccount ?? "",
      notes: v.notes ?? "",
    });
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/vendors/${editing.id}` : `/api/vendors`;
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("저장 실패: " + JSON.stringify(data));
      return;
    }
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    load();
  }

  async function onDelete(v: Vendor) {
    if (!confirm(`'${v.name}' 외주처를 삭제하시겠습니까? 관련 외주비도 함께 삭제됩니다.`))
      return;
    const res = await fetch(`/api/vendors/${v.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">외주처 목록</h1>
          <p className="text-slate-600 mt-1">외주 협력업체 정보를 관리합니다.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + 외주처 추가
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="input max-w-xs"
          placeholder="외주처명 / 담당자 / 분류 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-secondary" onClick={load}>
          검색
        </button>
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
              <th>외주처명</th>
              <th>담당자</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>분류</th>
              <th>외주비 건수</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  불러오는 중...
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  등록된 외주처가 없습니다.
                </td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium">{v.name}</td>
                  <td>{v.contactPerson || "-"}</td>
                  <td>{v.phone || "-"}</td>
                  <td>{v.email || "-"}</td>
                  <td>{v.category || "-"}</td>
                  <td>{v._count?.payments ?? 0}</td>
                  <td className="text-right">
                    <button
                      className="btn-secondary mr-2"
                      onClick={() => openEdit(v)}
                    >
                      편집
                    </button>
                    {isAdmin && (
                      <button
                        className="btn-danger"
                        onClick={() => onDelete(v)}
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
                  {editing ? "외주처 편집" : "외주처 추가"}
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
                <Field label="외주처명 *">
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="분류">
                  <input
                    className="input"
                    placeholder="예: 디자인, 개발, 번역"
                    value={form.category ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </Field>
                <Field label="담당자">
                  <input
                    className="input"
                    value={form.contactPerson ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, contactPerson: e.target.value })
                    }
                  />
                </Field>
                <Field label="연락처">
                  <input
                    className="input"
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="이메일">
                  <input
                    type="email"
                    className="input"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="사업자등록번호">
                  <input
                    className="input"
                    value={form.businessNumber ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, businessNumber: e.target.value })
                    }
                  />
                </Field>
                <Field label="은행">
                  <input
                    className="input"
                    value={form.bankName ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, bankName: e.target.value })
                    }
                  />
                </Field>
                <Field label="계좌번호">
                  <input
                    className="input"
                    value={form.bankAccount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, bankAccount: e.target.value })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="주소">
                    <input
                      className="input"
                      value={form.address ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="메모">
                    <textarea
                      className="textarea"
                      rows={3}
                      value={form.notes ?? ""}
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
