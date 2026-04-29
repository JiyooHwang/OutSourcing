import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "외주업체 관리",
  description: "외주처 및 외주비 관리 툴",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="ko">
      <body>
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold text-slate-900">
              외주업체 관리
            </Link>

            {user && (
              <nav className="flex gap-1">
                <Link
                  href="/vendors"
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                >
                  외주처 목록
                </Link>
                <Link
                  href="/payments"
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                >
                  외주비 관리
                </Link>
                {user.role === "ADMIN" && (
                  <>
                    <Link
                      href="/admin/users"
                      className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    >
                      사용자 관리
                    </Link>
                    <Link
                      href="/admin/audit"
                      className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                    >
                      감사 로그
                    </Link>
                  </>
                )}
              </nav>
            )}

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 text-sm">
                    {user.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <span className="text-slate-700">
                      {user.name || user.email}
                    </span>
                    <span
                      className={
                        user.role === "ADMIN"
                          ? "badge bg-slate-900 text-white"
                          : "badge bg-slate-200 text-slate-700"
                      }
                    >
                      {user.role}
                    </span>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/signin" });
                    }}
                  >
                    <button type="submit" className="btn-secondary">
                      로그아웃
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
