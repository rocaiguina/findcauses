"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client";

export function SignOutButton({ next = "/", children = "Sign out" }: { next?: string; children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-link"
      onClick={async () => {
        await apiPost("auth/signout", {});
        router.push(next);
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
