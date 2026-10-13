"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// While the payment is still being confirmed, re-check every 3 seconds (for up to 2 minutes).
export default function AutoRefresh() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= 40) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [tries, router]);

  return (
    <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
      {tries < 40
        ? "Checking again automatically…"
        : "Still waiting. You can safely leave this page; your order will update in My orders."}
    </p>
  );
}
