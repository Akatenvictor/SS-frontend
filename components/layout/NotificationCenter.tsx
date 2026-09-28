"use client";

/**
 * Notification Centre (issue #377)
 *
 * Bell icon with an unread badge opening a slide-out panel that lists investor
 * and issuer notifications newest-first. Every event kind (settlement, KYC
 * status, secondary-market sale, invoice approval/rejection) gets its own
 * icon, chip and destination; single and bulk mark-as-read are optimistic,
 * and clicking an item marks it read and navigates to its target page.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox, X } from "lucide-react";

import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from "@/hooks/useNotifications";
import { NotificationBellBadge } from "@/components/layout/NotificationBellBadge";
import { NotificationItemSkeleton } from "@/components/ui/skeletons";
import {
  getNotificationIcon,
  getNotificationPresentation,
  getNotificationTitle,
  resolveNotificationRoute,
} from "@/lib/notifications";
import type { NotificationItem } from "@/lib/api";

function formatTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

function NotificationRow({
  notification,
  onActivate,
  onMarkRead,
}: {
  notification: NotificationItem;
  onActivate: (notification: NotificationItem) => void;
  onMarkRead: (notification: NotificationItem) => void;
}) {
  const { label } = getNotificationPresentation(notification);
  const Icon = getNotificationIcon(notification.type);
  const timestamp = formatTimestamp(notification.created_at);

  return (
    <li className="border-b border-border/60 last:border-b-0">
      <div
        className={`flex items-start gap-3 px-4 py-3 ${
          notification.read ? "opacity-70" : "bg-muted/40"
        }`}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary"
          data-testid={`notification-icon-${notification.id}`}
        >
          <Icon className="h-4 w-4" />
        </span>

        <button
          type="button"
          onClick={() => onActivate(notification)}
          data-testid={`notification-item-${notification.id}`}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            {!notification.read && (
              <span
                data-testid={`notification-unread-dot-${notification.id}`}
                aria-label="Unread"
                className="h-2 w-2 shrink-0 rounded-full bg-primary"
              />
            )}
            <span
              className={`text-sm ${
                notification.read ? "font-normal" : "font-semibold"
              }`}
            >
              {getNotificationTitle(notification)}
            </span>
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {label}
            </span>
          </span>
          {notification.body && (
            <span className="mt-1 block text-xs text-muted-foreground">
              {notification.body}
            </span>
          )}
          {timestamp && (
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {timestamp}
            </span>
          )}
        </button>

        {!notification.read && (
          <button
            type="button"
            onClick={() => onMarkRead(notification)}
            data-testid={`notification-mark-read-${notification.id}`}
            aria-label={`Mark "${getNotificationTitle(notification)}" as read`}
            title="Mark as read"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const markOneRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch while the panel is open; refetch every time it re-opens so the list
  // is never stale when the user comes back to it.
  const { data: notifications, isLoading, isError } = useNotifications({
    enabled: open,
    refetchOnMount: "always",
  });

  const unreadCount = unreadData?.count ?? 0;

  // Close on outside click and on Escape — expected of a slide-out panel.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleMarkRead(notification: NotificationItem) {
    if (!notification.read) {
      markOneRead.mutate(notification.id);
    }
  }

  function handleClick(notification: NotificationItem) {
    handleMarkRead(notification);
    const route = resolveNotificationRoute(notification);
    if (route) {
      setOpen(false);
      router.push(route);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        data-testid="notification-bell"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md p-1 hover:bg-muted/50"
      >
        <NotificationBellBadge unreadCount={unreadCount > 0 ? unreadCount : null} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-96 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="mark-all-read-btn"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                title="Mark all as read"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
              <button
                type="button"
                aria-label="Close notifications"
                data-testid="close-notifications-btn"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-1" aria-busy="true" data-testid="notifications-loading">
                {Array.from({ length: 3 }).map((_, i) => (
                  <NotificationItemSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="px-4 py-8 text-center text-xs text-destructive">
                Failed to load notifications.
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 px-4 py-10 text-center"
                data-testid="notifications-empty"
              >
                <Inbox className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            ) : (
              <ul data-testid="notification-list">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onActivate={handleClick}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Keep the query keys exportable for tests and other consumers.
export { NOTIFICATIONS_QUERY_KEY, UNREAD_COUNT_QUERY_KEY };

export default NotificationCenter;
