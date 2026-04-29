"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

type Role = "ADMIN" | "MEMBER";

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  createdAt: string;
};

export default function UsersClient({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("불러오기 실패");
      setUsers(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(u: User, role: Role) {
    if (u.id === currentUserId && role !== "ADMIN") {
      alert("본인의 관리자 권한은 해제할 수 없습니다.");
      return;
    }
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("역할 변경 실패: " + (data.error || res.statusText));
      return;
    }
    load();
  }

  async function removeUser(u: User) {
    if (u.id === currentUserId) {
      alert("본인 계정은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`${u.email} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-slate-600 mt-1">
          팀원의 권한을 관리합니다. (ADMIN만 접근 가능)
        </p>
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
              <th>사용자</th>
              <th>이메일</th>
              <th>역할</th>
              <th>가입일</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-6">
                  불러오는 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-6">
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {u.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.image}
                          alt=""
                          className="w-7 h-7 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {u.name || "(이름 없음)"}
                        {u.id === currentUserId && (
                          <span className="ml-2 text-xs text-slate-500">
                            (나)
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="select max-w-[140px]"
                      value={u.role}
                      onChange={(e) =>
                        changeRole(u, e.target.value as Role)
                      }
                      disabled={u.id === currentUserId}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="text-right">
                    <button
                      className="btn-danger"
                      onClick={() => removeUser(u)}
                      disabled={u.id === currentUserId}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4 text-sm text-slate-600 bg-slate-50">
        <strong>참고:</strong> 역할 변경 후 해당 사용자가 다시 로그인하거나
        세션이 갱신되어야 권한이 적용됩니다.
      </div>
    </div>
  );
}
