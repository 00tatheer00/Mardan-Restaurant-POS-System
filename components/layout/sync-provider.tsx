"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/stores/cart";
import { useUI } from "@/lib/stores/ui";
import { syncNow } from "@/lib/sync";

export function SyncProvider() {
  useEffect(() => {
    void useCart.persist.rehydrate();
    void useUI.persist.rehydrate();
    if (window.self !== window.top) return; // receipt print iframe
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const kick = () => void syncNow();
    const t = setTimeout(kick, 0);
    const i = setInterval(kick, 10_000);
    window.addEventListener("online", kick);
    window.addEventListener("kh-queue", kick);
    return () => {
      clearTimeout(t);
      clearInterval(i);
      window.removeEventListener("online", kick);
      window.removeEventListener("kh-queue", kick);
    };
  }, []);
  return null;
}
