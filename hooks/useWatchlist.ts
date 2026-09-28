"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
  type WatchlistResponse,
} from "@/lib/api";
import { useStellarWallet } from "./useStellarWallet";
import { toast } from "sonner";

const WATCHLIST_KEY = "local_watchlist";

function getLocalWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setLocalWatchlist(items: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

export function useWatchlist() {
  const { address, isConnected } = useStellarWallet();
  const queryClient = useQueryClient();

  const { data: serverWatchlist, isLoading } = useQuery({
    queryKey: ["watchlist", address],
    queryFn: fetchWatchlist,
    enabled: isConnected && !!address,
    staleTime: 30_000,
  });

  const serverItems = serverWatchlist?.items.map((i) => i.invoice_id) ?? [];
  const [localItems, setLocalItems] = useState<string[]>(() =>
    getLocalWatchlist()
  );

  const mergedItems = isConnected
    ? serverItems
    : [...new Set([...localItems, ...serverItems])];

  useEffect(() => {
    if (!isConnected) {
      setLocalItems(getLocalWatchlist());
    }
  }, [isConnected]);

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onMutate: async (invoiceId) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist", address] });
      const previous = queryClient.getQueryData<WatchlistResponse>([
        "watchlist",
        address,
      ]);

      if (isConnected) {
        queryClient.setQueryData<WatchlistResponse>(
          ["watchlist", address],
          (old) => ({
            items: [
              ...(old?.items ?? []),
              { invoice_id: invoiceId, added_at: new Date().toISOString() },
            ],
          })
        );
      } else {
        const newLocal = [...new Set([...localItems, invoiceId])];
        setLocalItems(newLocal);
        setLocalWatchlist(newLocal);
      }

      return { previous };
    },
    onError: (_err, invoiceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["watchlist", address], context.previous);
      } else if (!isConnected) {
        const newLocal = localItems.filter((id) => id !== invoiceId);
        setLocalItems(newLocal);
        setLocalWatchlist(newLocal);
      }
      toast.error("Failed to bookmark. Please try again.");
    },
    onSettled: () => {
      if (isConnected) {
        queryClient.invalidateQueries({ queryKey: ["watchlist", address] });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onMutate: async (invoiceId) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist", address] });
      const previous = queryClient.getQueryData<WatchlistResponse>([
        "watchlist",
        address,
      ]);

      if (isConnected) {
        queryClient.setQueryData<WatchlistResponse>(
          ["watchlist", address],
          (old) => ({
            items: (old?.items ?? []).filter((i) => i.invoice_id !== invoiceId),
          })
        );
      } else {
        const newLocal = localItems.filter((id) => id !== invoiceId);
        setLocalItems(newLocal);
        setLocalWatchlist(newLocal);
      }

      return { previous };
    },
    onError: (_err, invoiceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["watchlist", address], context.previous);
      } else if (!isConnected) {
        const newLocal = [...new Set([...localItems, invoiceId])];
        setLocalItems(newLocal);
        setLocalWatchlist(newLocal);
      }
      toast.error("Failed to remove bookmark. Please try again.");
    },
    onSettled: () => {
      if (isConnected) {
        queryClient.invalidateQueries({ queryKey: ["watchlist", address] });
      }
    },
  });

  const toggle = (invoiceId: string) => {
    if (mergedItems.includes(invoiceId)) {
      removeMutation.mutate(invoiceId);
    } else {
      addMutation.mutate(invoiceId);
    }
  };

  const isBookmarked = (invoiceId: string) => mergedItems.includes(invoiceId);

  return {
    items: mergedItems,
    isLoading,
    toggle,
    isBookmarked,
    count: mergedItems.length,
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}