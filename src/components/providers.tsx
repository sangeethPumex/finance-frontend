"use client";

import { useState } from "react";
import { IconContext } from "@phosphor-icons/react";
import { QueryClient, QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Toaster } from "sonner";

/** Thin indeterminate bar at the top while any request is in flight;. */
function TopLoader() {
  const busy = useIsFetching() + useIsMutating() > 0;
  if (!busy) return null;
  return (
    <div role="status" aria-label="Loading" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-ink/10">
      <div className="top-loader h-full w-1/3 bg-ink" />
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <IconContext.Provider value={{ weight: "light" }}>
      <QueryClientProvider client={client}><TopLoader />{children}</QueryClientProvider>
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: 2 } }} />
    </IconContext.Provider>
  );
}
