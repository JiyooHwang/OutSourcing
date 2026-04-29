import { auth } from "@/auth";
import VendorsClient from "./VendorsClient";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  return <VendorsClient isAdmin={isAdmin} />;
}
