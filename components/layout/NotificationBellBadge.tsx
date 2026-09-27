"use client";

import { Bell } from "lucide-react";

interface NotificationBellBadgeProps {
  unreadCount: number | null;
}

export function NotificationBellBadge({ unreadCount }: NotificationBellBadgeProps) {
  return (
    <div className="relative inline-flex">
      <Bell className="h-5 w-5 text-muted-foreground" />
      {unreadCount !== null && unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
}
