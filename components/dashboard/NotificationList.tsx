"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";

export function NotificationList() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markReadMutation = useMarkNotificationRead();

  if (isLoading) {
    return (
      <Card data-testid="notifications-loading">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !notifications || notifications.length === 0) {
    return (
      <Card data-testid="notifications-empty">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No notifications found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="notifications-container">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((item) => {
          const isRead = item.read ?? (item as any).is_read ?? false;

          return (
            <div
              key={item.id}
              data-testid={`notification-item-${item.id}`}
              onClick={() => {
                if (!isRead) {
                  markReadMutation.mutate(item.id);
                }
              }}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                !isRead
                  ? "bg-muted/40 border-primary/30 hover:bg-muted/60"
                  : "bg-background hover:bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="space-y-1">
                {item.title && <p className="font-semibold text-sm">{item.title}</p>}
                <p className="text-sm">{item.message}</p>
                {(item.createdAt || (item as any).created_at) && (
                  <p className="text-xs text-muted-foreground">
                    {item.createdAt || (item as any).created_at}
                  </p>
                )}
              </div>
              {!isRead && (
                <span
                  data-testid={`unread-indicator-${item.id}`}
                  className="h-3 w-3 rounded-full bg-primary flex-shrink-0"
                  title="Unread"
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
