// =============================================================
// 공통 유틸 / 상수 / 데이터 저장 / 마이그레이션
// 다른 파일들이 모두 이 파일에 정의된 값을 글로벌로 사용합니다.
// =============================================================

const { useState, useEffect, useMemo, useRef, Fragment } = React;

const STORAGE_KEY = "outsourcing-tool-data-v2";
const LEGACY_STORAGE_KEY = "outsourcing-tool-data-v1";

// -------------------------------------------------------------
// 상태/회차 라벨
// -------------------------------------------------------------
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

const INSTALLMENT_TYPES = ["DOWN", "INTERIM", "FINAL"];

const INSTALLMENT_LABEL = {
  DOWN: "선금",
  INTERIM: "중도금",
  FINAL: "잔금",
};

const PRESETS = [
  { key: "full",     label: "단일 (잔금)",       types: ["FINAL"],                    ratios: [1] },
  { key: "half",     label: "선금/잔금 (5:5)",   types: ["DOWN", "FINAL"],            ratios: [0.5, 0.5] },
  { key: "third343", label: "선/중/잔 (3:4:3)",  types: ["DOWN", "INTERIM", "FINAL"], ratios: [0.3, 0.4, 0.3] },
  { key: "equal3",   label: "3등분",             types: ["DOWN", "INTERIM", "FINAL"], ratios: [1 / 3, 1 / 3, 1 / 3] },
];

function makeInstallment(type, amount = 0) {
  return { type, amount, status: "PENDING", dueDate: "", paidDate: "", note: "" };
}

// -------------------------------------------------------------
// localStorage 저장/복원 + 구버전 마이그레이션
// -------------------------------------------------------------
function migratePayment(p) {
  if (Array.isArray(p.installments)) return p;
  // v1 (단일 amount) → v2 (잔금 1건) 변환
  return {
    id: p.id,
    vendorId: p.vendorId,
    projectName: p.projectName,
    description: p.description || "",
    currency: p.currency || "KRW",
    notes: p.notes || "",
    createdAt: p.createdAt || new Date().toISOString(),
    totalAmount: Number(p.amount) || 0,
    installments: [
      {
        type: "FINAL",
        amount: Number(p.amount) || 0,
        status: p.status || "PENDING",
        dueDate: p.dueDate || "",
        paidDate: p.paidDate || "",
        note: "",
      },
    ],
  };
}

function loadData() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 구버전 키에서 한 번 옮겨오기
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) return { vendors: [], payments: [] };
    const parsed = JSON.parse(raw);
    return {
      vendors: parsed.vendors ?? [],
      payments: (parsed.payments ?? []).map(migratePayment),
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

// -------------------------------------------------------------
// 포맷터
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// CSV 내보내기
// -------------------------------------------------------------
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
  const body = "﻿" + lines.join("\r\n"); // BOM (Excel 한글 호환)
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
