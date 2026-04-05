import { redirect } from "next/navigation";

/** Root "/" redirects authenticated users to /dashboard, others to /login. */
export default function RootPage() {
  redirect("/dashboard");
}
