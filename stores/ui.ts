"use client";

import { create } from "zustand";

interface UIState {
  /**
   * True while the product page's mobile "Add to Cart" bar is on screen, so
   * global floating elements (the WhatsApp button) can lift above it instead of
   * overlapping. Set by StickyBottomBar; read by WhatsAppButton.
   */
  pdpBarVisible: boolean;
  setPdpBarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  pdpBarVisible: false,
  setPdpBarVisible: (visible) => set({ pdpBarVisible: visible }),
}));
