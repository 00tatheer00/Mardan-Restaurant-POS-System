import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = { collapsed: boolean; toggle: () => void };

export const useUI = create<UIState>()(
  persist((set) => ({ collapsed: false, toggle: () => set((s) => ({ collapsed: !s.collapsed })) }), { name: "kh-ui" }),
);
