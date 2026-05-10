"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { normalizeTenantCurrencySymbol } from "@/lib/tenant-currency";

export type TenantPreferencesState = {
  businessName: string;
  ownerName: string;
  currencySymbol: string;
  defaultWeeklyRate: number;
  notificationEmail: string;
  loading: boolean;
};

type TenantPreferencesContextValue = TenantPreferencesState & {
  refresh: () => Promise<void>;
};

const DEFAULT_STATE: TenantPreferencesState = {
  businessName: "",
  ownerName: "",
  currencySymbol: "£",
  defaultWeeklyRate: 80,
  notificationEmail: "",
  loading: true,
};

const TenantPreferencesContext = createContext<TenantPreferencesContextValue | null>(null);

export function TenantPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantPreferencesState>(DEFAULT_STATE);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch("/api/tenant/settings");
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const data = (await res.json()) as Partial<TenantPreferencesState>;
      setState({
        businessName: typeof data.businessName === "string" ? data.businessName : "",
        ownerName: typeof data.ownerName === "string" ? data.ownerName : "",
        currencySymbol: normalizeTenantCurrencySymbol(data.currencySymbol),
        defaultWeeklyRate:
          typeof data.defaultWeeklyRate === "number" && Number.isFinite(data.defaultWeeklyRate)
            ? data.defaultWeeklyRate
            : 80,
        notificationEmail: typeof data.notificationEmail === "string" ? data.notificationEmail : "",
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<TenantPreferencesContextValue>(
    () => ({
      ...state,
      refresh,
    }),
    [state, refresh]
  );

  return <TenantPreferencesContext.Provider value={value}>{children}</TenantPreferencesContext.Provider>;
}

export function useTenantPreferences(): TenantPreferencesContextValue {
  const ctx = useContext(TenantPreferencesContext);
  if (!ctx) {
    return { ...DEFAULT_STATE, loading: false, refresh: async () => {} };
  }
  return ctx;
}
