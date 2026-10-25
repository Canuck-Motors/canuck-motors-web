"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Opening the cart always re-reads it from the server, so a part just added is never missing.
export default function CartRefresh() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
