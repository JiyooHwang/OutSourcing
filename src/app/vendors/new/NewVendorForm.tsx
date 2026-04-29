"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  businessNumber: string;
  bankName: string;
  bankAccount: string;
  address: string;
  notes: string;
};

const empty: FormState = {
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

export default function NewVendorForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "저장 실패: 입력값을 확인해주세요."
        );
      }
      router.push("/vendors");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitAndAddAnother(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "저장 실패: 입력값을 확인해주세요."
        );
      }
      setForm(empty);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">외주처 추가</h1>
          <p className="text-slate-600 mt-1">
            새로운 협력업체 정보를 입력합니다.
          </p>
        </div>
        <Link href="/vendors" className="btn-secondary">
          목록으로
        </Link>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-6 space-y-6">
        <Section title="기본 정보">
          <Field label="외주처명 *">
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="분류">
            <input
              className="input"
              placeholder="예: 디자인, 개발, 번역"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="담당자 / 연락처">
          <Field label="담당자">
            <input
              className="input"
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
            />
          </Field>
          <Field label="연락처">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="이메일" full>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="사업자 / 정산 정보">
          <Field label="사업자등록번호">
            <input
              className="input"
              placeholder="000-00-00000"
              value={form.businessNumber}
              onChange={(e) => update("businessNumber", e.target.value)}
            />
          </Field>
          <Field label="은행">
            <input
              className="input"
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
            />
          </Field>
          <Field label="계좌번호" full>
            <input
              className="input"
              value={form.bankAccount}
              onChange={(e) => update("bankAccount", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="기타">
          <Field label="주소" full>
            <input
              className="input"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <Field label="메모" full>
            <textarea
              className="textarea"
              rows={4}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </Section>

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
          <Link href="/vendors" className="btn-secondary">
            취소
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={onSubmitAndAddAnother}
            disabled={submitting || !form.name}
          >
            {submitting ? "저장 중..." : "저장 후 계속 추가"}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !form.name}
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
