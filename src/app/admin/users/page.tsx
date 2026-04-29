import { redirect } from "next/navigation";
import { auth } from "@/auth";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }
  return <UsersClient currentUserId={session.user.id} />;
}
