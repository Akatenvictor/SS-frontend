"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmailNotificationPreferences,
  saveEmailNotificationPreferences,
  type EmailNotificationPreference,
  type EmailNotificationType,
} from "@/lib/api";

export const EMAIL_PREFERENCES_QUERY_KEY = ["email-notification-preferences"] as const;

/** Canonical ordering and copy for the settings page. */
export const EMAIL_NOTIFICATION_TYPES: {
  event_type: EmailNotificationType;
  label: string;
  description: string;
}[] = [
  {
    event_type: "settlement",
    label: "Settlement",
    description: "An invoice you hold has settled and funds have been returned.",
  },
  {
    event_type: "kyc_status",
    label: "KYC status",
    description: "Your identity verification is approved, rejected or needs action.",
  },
  {
    event_type: "watchlist_invoice_match",
    label: "Watchlist matches",
    description: "A new invoice matches your saved watchlist criteria.",
  },
  {
    event_type: "secondary_market_sale",
    label: "Secondary market sales",
    description: "An invoice you own is sold on the secondary market.",
  },
  {
    event_type: "invoice_decision",
    label: "Invoice decisions",
    description: "One of your submitted invoices is approved or rejected.",
  },
];

export const ALL_EMAIL_TYPES = EMAIL_NOTIFICATION_TYPES.map((t) => t.event_type);

export function useEmailNotificationPreferences() {
  return useQuery({
    queryKey: EMAIL_PREFERENCES_QUERY_KEY,
    queryFn: fetchEmailNotificationPreferences,
  });
}

/**
 * Bulk save: the whole toggle set is persisted in one PUT so the UI and the
 * server cannot disagree about a partially applied set of changes.
 */
export function useSaveEmailNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: EmailNotificationPreference[]) =>
      saveEmailNotificationPreferences(preferences),
  });
}

export interface UseEmailNotificationPreferencesForm {
  preferences: EmailNotificationPreference[];
  isLoading: boolean;
  loadError: boolean;
  isSaving: boolean;
  isDirty: boolean;
  toggle: (eventType: EmailNotificationType, enabled: boolean) => void;
  setAll: (enabled: boolean) => void;
  save: (handlers?: SaveHandlers) => void;
  retry: () => void;
  canSave: boolean;
}

export interface SaveHandlers {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Owns the editable copy of the preferences, seeded from the API on load and
 * re-seeded whenever a save succeeds. Editing is local until `save()` is called.
 */
export function useEmailNotificationPreferencesForm(): UseEmailNotificationPreferencesForm {
  const query = useEmailNotificationPreferences();
  const saveMutation = useSaveEmailNotificationPreferencesMutation();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<EmailNotificationPreference[] | null>(null);
  const serverPreferences = query.data ?? null;

  // Re-seed the draft whenever a fresh server payload arrives (first load, or a
  // refetch after a successful save).
  useEffect(() => {
    if (serverPreferences) {
      setDraft(serverPreferences);
    }
  }, [serverPreferences]);

  const preferences = useMemo(() => draft ?? [], [draft]);

  const isDirty = useMemo(() => {
    if (!serverPreferences) return false;
    if (draft === null) return false;
    return JSON.stringify(sortForComparison(draft)) !== JSON.stringify(sortForComparison(serverPreferences));
  }, [draft, serverPreferences]);

  const toggle = useCallback((eventType: EmailNotificationType, enabled: boolean) => {
    setDraft((current) => {
      const base = current ?? [];
      const existing = base.find((pref) => pref.event_type === eventType);
      if (existing) {
        return base.map((pref) =>
          pref.event_type === eventType ? { ...pref, email: enabled } : pref
        );
      }
      // A type the API has not returned yet still needs to be toggleable.
      return [...base, { event_type: eventType, email: enabled }];
    });
  }, []);

  const setAll = useCallback((enabled: boolean) => {
    setDraft((current) => {
      const base = current ?? [];
      return base.map((pref) => ({ ...pref, email: enabled }));
    });
  }, []);

  const save = useCallback(
    (handlers?: SaveHandlers) => {
      saveMutation.mutate(preferences, {
        onSuccess: () => {
          queryClient.setQueryData(EMAIL_PREFERENCES_QUERY_KEY, preferences);
          handlers?.onSuccess?.();
        },
        onError: (error) => handlers?.onError?.(error),
      });
    },
    [preferences, saveMutation, queryClient]
  );

  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    preferences,
    isLoading: query.isLoading,
    loadError: query.isError,
    isSaving: saveMutation.isPending,
    isDirty,
    toggle,
    setAll,
    save,
    retry,
    canSave: isDirty && !saveMutation.isPending,
  };
}

/** Order-independent so a reordered API payload is not treated as a change. */
function sortForComparison(
  preferences: EmailNotificationPreference[]
): EmailNotificationPreference[] {
  return [...preferences].sort((a, b) =>
    a.event_type.localeCompare(b.event_type)
  );
}
