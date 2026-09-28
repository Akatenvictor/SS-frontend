"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ALL_EMAIL_TYPES,
  EMAIL_NOTIFICATION_TYPES,
  useEmailNotificationPreferencesForm,
} from "@/hooks/useEmailNotificationPreferences";
import type { EmailNotificationType } from "@/lib/api";

/**
 * Email notification settings.
 *
 * Toggles are staged locally and persisted in one request via Save, so a burst
 * of toggles produces a single write and a single confirmation.
 */
export function EmailNotificationPreferencesSettings() {
  const {
    preferences,
    isLoading,
    loadError,
    isSaving,
    isDirty,
    toggle,
    setAll,
    save,
    retry,
    canSave,
  } = useEmailNotificationPreferencesForm();

  const [saveFailed, setSaveFailed] = useState(false);

  // Derived from the draft so the summary reflects unsaved edits too.
  const enabledCount = useMemo(
    () => preferences.filter((pref) => pref.email).length,
    [preferences]
  );

  const isEnabled = (eventType: EmailNotificationType) =>
    preferences.find((pref) => pref.event_type === eventType)?.email ?? false;

  const allEnabled = preferences.length > 0 && enabledCount === preferences.length;

  function handleSave() {
    setSaveFailed(false);
    save({
      onSuccess: () => toast.success("Notification preferences saved"),
      onError: () => {
        setSaveFailed(true);
        toast.error("Could not save notification preferences. Please try again.");
      },
    });
  }

  /** Any edit dismisses a previous failure banner. */
  function handleToggle(eventType: EmailNotificationType, enabled: boolean) {
    setSaveFailed(false);
    toggle(eventType, enabled);
  }

  function handleSetAll(enabled: boolean) {
    setSaveFailed(false);
    setAll(enabled);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4" data-testid="email-preferences-loading">
          {ALL_EMAIL_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-5 w-9" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Email notifications</h1>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            data-testid="email-preferences-load-error"
            className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4"
          >
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              We could not load your notification preferences.
            </p>
            <Button variant="outline" size="sm" onClick={retry} data-testid="email-preferences-retry">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold">Email notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choose which platform events send you an email. Changes apply once you save.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">All email notifications</p>
            <p className="text-xs text-muted-foreground" data-testid="email-preferences-summary">
              {enabledCount} of {preferences.length} enabled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSetAll(true)}
              data-testid="enable-all"
            >
              Enable all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSetAll(false)}
              data-testid="disable-all"
            >
              Disable all
            </Button>
            <Switch
              checked={allEnabled}
              onCheckedChange={(checked) => handleSetAll(checked)}
              aria-label="Toggle all email notifications"
              data-testid="toggle-all"
            />
          </div>
        </div>

        <div className="divide-y">
          {EMAIL_NOTIFICATION_TYPES.map(({ event_type, label, description }) => (
            <div
              key={event_type}
              data-testid={`email-preference-row-${event_type}`}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div className="space-y-0.5">
                <label
                  htmlFor={`email-preference-${event_type}`}
                  className="text-sm font-medium"
                >
                  {label}
                </label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={`email-preference-${event_type}`}
                checked={isEnabled(event_type)}
                onCheckedChange={(checked) => handleToggle(event_type, checked)}
                aria-label={`Email notifications for ${label}`}
                data-testid={`email-preference-${event_type}`}
              />
            </div>
          ))}
        </div>

        {saveFailed && (
          <div
            role="alert"
            data-testid="email-preferences-save-error"
            className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-3"
          >
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              Your changes were not saved. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              data-testid="email-preferences-retry-save"
            >
              Retry save
            </Button>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {isDirty && (
            <span className="text-xs text-muted-foreground" data-testid="email-preferences-unsaved">
              Unsaved changes
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!canSave}
            data-testid="save-email-preferences"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save preferences"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
