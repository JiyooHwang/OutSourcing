"use client";

import { Fragment, useEffect, useState } from "react";

type Entity = "VENDOR" | "PAYMENT" | "USER" | "ATTACHMENT";
type Action = "CREATE" | "UPDATE" | "DELETE";

type LogItem = {
  id: string;
  actorId: string | null;
  actorEmail: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  action: Action;
  entity: Entity;
  entityId: string;
  summary: string;
  changes: unknown;
  createdAt: string;
};

const ENTITY_LABEL: Record<Entity, string> = {
  VENDOR: "외주처",
  PAYMENT: "외주비",
  USER: "사용자",
  ATTACHMENT: "첨부",
};

const ACTION_LABEL: Record<Action, string> = {
  CREATE: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
};

const ACTION_BADGE: Record<Action, string> = {
  CREATE: "badge bg-emerald-100 text-emerald-800",
  UPDATE: "badge bg-sky-100 text-sky-800",
  DELETE: "badge bg-red-100 text-red-800",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export default function AuditClient() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [entity, setEntity] = useState<"" | Entity>("");
  const [action, setAction] = useState<"" | Action>("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load(reset = true) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      setItems(reset ? data.items : [...items, ...data.items]);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, action]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">감사 로그</h1>
        <p className="text-slate-600 mt-1">
          모든 데이터 변경 이력을 확인합니다. (ADMIN만 접근 가능)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="select max-w-[180px]"
          value={entity}
          onChange={(e) => setEntity(e.target.value as "" | Entity)}
        >
          <option value="">전체 대상</option>
          <option value="VENDOR">외주처</option>
          <option value="PAYMENT">외주비</option>
          <option value="USER">사용자</option>
          <option value="ATTACHMENT">첨부</option>
        </select>
        <select
          className="select max-w-[180px]"
          value={action}
          onChange={(e) => setAction(e.target.value as "" | Action)}
        >
          <option value="">전체 액션</option>
          <option value="CREATE">생성</option>
          <option value="UPDATE">수정</option>
          <option value="DELETE">삭제</option>
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
              <th>일시</th>
              <th>사용자</th>
              <th>액션</th>
              <th>대상</th>
              <th>설명</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-6">
                  불러오는 중...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-6">
                  감사 로그가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td className="whitespace-nowrap text-slate-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {log.actor?.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={log.actor.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span>
                          {log.actor?.name ||
                            log.actor?.email ||
                            log.actorEmail}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={ACTION_BADGE[log.action]}>
                        {ACTION_LABEL[log.action]}
                      </span>
                    </td>
                    <td>{ENTITY_LABEL[log.entity]}</td>
                    <td>{log.summary}</td>
                    <td className="text-right">
                      {log.changes != null && (
                        <button
                          className="btn-secondary"
                          onClick={() => toggleExpand(log.id)}
                        >
                          {expanded.has(log.id) ? "접기" : "상세"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded.has(log.id) && log.changes != null && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50">
                        <pre className="text-xs whitespace-pre-wrap break-all p-2 text-slate-700">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="text-center">
          <button
            className="btn-secondary"
            onClick={() => load(false)}
            disabled={loadingMore}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
