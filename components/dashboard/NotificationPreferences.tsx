"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { NotificationEventType, NotificationPreference } from "@/lib/api";
import {
  INVESTOR_NOTIFICATION_EVENTS,
  SELLER_NOTIFICATION_EVENTS,
  useNotificationPreferences,
  useUpdateNotificationPreferenceMutation,
} from "@/hooks/useNotificationPreferences";

const EVENT_LABELS: Record<NotificationEventType, string> = {
  new_invoice: "New invoice",
  funding_milestone: "Funding milestone",
  settlement: "Settlement",
  invoice_funded: "Invoice funded",
  invoice_settled: "Invoice settled",
  invoice_matured: "Invoice matured",
  invoice_rejected: "Invoice rejected",
  deadline_extended: "Deadline extended",
};

const GROUPS: { title: string; eventTypes: NotificationEventType[] }[] = [
  { title: "Seller events", eventTypes: SELLER_NOTIFICATION_EVENTS },
  { title: "Investor events", eventTypes: INVESTOR_NOTIFICATION_EVENTS },
];

function NotificationPreferencesSkeleton() {
  return (
    <div className="space-y-3" data-testid="notification-preferences-loading" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-6">
            <Skeleton className="h-5 w-9" />
            <Skeleton className="h-5 w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const { mutate: updatePreference } = useUpdateNotificationPreferenceMutation();

  // The API may omit entries for newer event types; missing ones default to
  // disabled so every event type always gets a toggle.
  const byEventType = new Map<NotificationEventType, NotificationPreference>();
  (preferences ?? []).forEach((pref) => byEventType.set(pref.event_type, pref));

  function preferenceFor(eventType: NotificationEventType): NotificationPreference {
    return byEventType.get(eventType) ?? { event_type: eventType, email: false, in_app: false };
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold">Notification Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified for each event type.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading || !preferences ? (
          <NotificationPreferencesSkeleton />
        ) : (
          GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="mb-6 last:mb-0">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.title}
              </h2>
              <div className="divide-y">
                {group.eventTypes.map((eventType) => {
                  const pref = preferenceFor(eventType);
                  return (
                    <div key={eventType} className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium">{EVENT_LABELS[eventType]}</span>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          Email
                          <Switch
                            checked={pref.email}
                            onCheckedChange={(checked) =>
                              updatePreference({
                                eventType,
                                channel: "email",
                                enabled: checked,
                              })
                            }
                            aria-label={`Email notifications for ${EVENT_LABELS[eventType]}`}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          In-app
                          <Switch
                            checked={pref.in_app}
                            onCheckedChange={(checked) =>
                              updatePreference({
                                eventType,
                                channel: "in_app",
                                enabled: checked,
                              })
                            }
                            aria-label={`In-app notifications for ${EVENT_LABELS[eventType]}`}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
