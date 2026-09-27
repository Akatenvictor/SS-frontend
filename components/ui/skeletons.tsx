import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-shaped loading placeholders (issue #324).
 *
 * Each skeleton mirrors the dimensions of the component it stands in for so
 * there is no layout shift when real content arrives. `aria-busy="true"` is
 * set while loading; the real content containers set nothing, which is
 * equivalent to `aria-busy="false"`.
 */

/** Matches the marketplace invoice rows: title + status, 4-col meta, progress. */
export function InvoiceCardSkeleton() {
  return (
    <Card aria-busy="true" data-testid="invoice-card-skeleton">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-4 w-12 mb-1" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div>
            <Skeleton className="h-4 w-8 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="mt-4 h-2 w-full" />
      </CardContent>
    </Card>
  );
}

/** Matches an investor portfolio position row inside a Card. */
export function PortfolioRowSkeleton() {
  return (
    <Card aria-busy="true" data-testid="portfolio-row-skeleton">
      <CardContent className="flex items-center justify-between pt-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16" />
      </CardContent>
    </Card>
  );
}

/** Matches a notification centre item: unread dot, title, body, timestamp. */
export function NotificationItemSkeleton() {
  return (
    <div
      aria-busy="true"
      data-testid="notification-item-skeleton"
      className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5"
    >
      <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </span>
    </div>
  );
}

/** Matches the stat cards shown on the seller dashboard/profile. */
export function ProfileStatsSkeleton() {
  return (
    <div
      aria-busy="true"
      data-testid="profile-stats-skeleton"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} aria-hidden="true">
          <CardContent className="pt-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
