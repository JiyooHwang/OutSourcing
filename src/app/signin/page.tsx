import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { error, callbackUrl } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl || "/");
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center">외주업체 관리</h1>
        <p className="text-center text-slate-600 mt-2 text-sm">
          팀 계정으로 로그인하세요.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            {error === "AccessDenied"
              ? "허용되지 않은 계정입니다. 관리자에게 문의하세요."
              : "로그인 중 오류가 발생했습니다. 다시 시도해주세요."}
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl || "/" });
          }}
          className="mt-6"
        >
          <button type="submit" className="btn-primary w-full py-3">
            Google 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
