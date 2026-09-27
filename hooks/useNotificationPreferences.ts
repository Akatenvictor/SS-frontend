"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchNotificationPreferences,
  updateNotificationPreference,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationPreference,
} from "@/lib/api";

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ["notification-preferences"] as const;

/**
 * Notification event types grouped by who they concern (issue #322).
 *
 * Sellers are notified about their own invoices' lifecycle; investors about
 * the marketplace and the positions they hold. Every known event type must
 * appear in exactly one of the two lists so the preferences page can render
 * each group completely even when the API omits some entries.
 */
export const SELLER_NOTIFICATION_EVENTS: NotificationEventType[] = [
  "invoice_funded",
  "invoice_settled",
  "invoice_rejected",
  "deadline_extended",
];

export const INVESTOR_NOTIFICATION_EVENTS: NotificationEventType[] = [
  "new_invoice",
  "funding_milestone",
  "settlement",
  "invoice_matured",
];

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: fetchNotificationPreferences,
  });
}

interface UpdatePreferenceVars {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  enabled: boolean;
}

export function useUpdateNotificationPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventType, channel, enabled }: UpdatePreferenceVars) =>
      updateNotificationPreference(eventType, channel, enabled),

    onMutate: async ({ eventType, channel, enabled }) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY });

      const previous = queryClient.getQueryData<NotificationPreference[]>(
        NOTIFICATION_PREFERENCES_QUERY_KEY
      );

      queryClient.setQueryData<NotificationPreference[]>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
        (old) =>
          old?.map((pref) =>
            pref.event_type === eventType
              ? { ...pref, [channel === "email" ? "email" : "in_app"]: enabled }
              : pref
          )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATION_PREFERENCES_QUERY_KEY, context.previous);
      }
      toast.error("Failed to save notification preference. Please try again.");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY });
    },
  });
}
