"use client";

import { useEffect } from "react";
import { setLocalUser } from "@/lib/db";
import { useCart } from "@/lib/stores/cart";
import { refreshStatus, syncNow } from "@/lib/sync";

// Binds the offline cache + sync queue to the logged-in user (shared counter PC).
export function LocalUser({ id }: { id: string }) {
  useEffect(() => {
    void setLocalUser(id).then((switched) => {
      if (switched) useCart.getState().clear();
      void refreshStatus();
      void syncNow();
    });
  }, [id]);
  return null;
}
