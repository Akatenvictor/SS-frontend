"use client";

/**
 * Notification presentation (issue #377)
 *
 * The notification centre needs to render several event kinds differently —
 * each has its own icon, label and the page it should navigate to when the
 * user clicks it. Keeping that mapping in one pure module (rather than
 * scattering conditionals through the component) makes the routing rules for
 * every type directly testable.
 */

import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  FileCheck2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { NotificationItem } from "@/lib/api";

export type NotificationCategory = "settlement" | "kyc" | "listing" | "invoice" | "general";

export interface NotificationPresentation {
  category: NotificationCategory;
  /** Short label shown as a chip next to the notification. */
  label: string;
  icon: LucideIcon;
  /** Fallback copy when the backend sends neither a title nor a message. */
  fallbackTitle: string;
  /** Where a click should navigate when the notification carries no link. */
  defaultRoute: string | null;
}

const PRESENTATIONS: Record<NotificationCategory, NotificationPresentation> = {
  settlement: {
    category: "settlement",
    label: "Settlement",
    icon: Banknote,
    fallbackTitle: "Settlement processed",
    defaultRoute: "/investor",
  },
  kyc: {
    category: "kyc",
    label: "KYC",
    icon: BadgeCheck,
    fallbackTitle: "KYC status updated",
    defaultRoute: "/kyc/status",
  },
  listing: {
    category: "listing",
    label: "Secondary market",
    icon: CheckCircle2,
    fallbackTitle: "Your fraction was sold",
    defaultRoute: "/marketplace/resale",
  },
  invoice: {
    category: "invoice",
    label: "Invoice",
    icon: FileCheck2,
    fallbackTitle: "Invoice updated",
    defaultRoute: "/marketplace",
  },
  general: {
    category: "general",
    label: "Update",
    icon: Info,
    fallbackTitle: "New notification",
    defaultRoute: null,
  },
};

/**
 * Event kinds are mapped to a category by name. Several aliases are accepted
 * because the same event has been spelled differently across API revisions.
 */
const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  settlement: "settlement",
  settled: "settlement",
  invoice_settled: "settlement",
  invoice_matured: "settlement",
  payout: "settlement",

  kyc: "kyc",
  kyc_status: "kyc",
  kyc_approved: "kyc",
  kyc_rejected: "kyc",
  identity_verified: "kyc",

  listing: "listing",
  listing_sold: "listing",
  fraction_sold: "listing",
  resale_sold: "listing",
  listing_cancelled: "listing",

  invoice: "invoice",
  invoice_approved: "invoice",
  invoice_rejected: "invoice",
  invoice_funded: "invoice",
  funding_milestone: "invoice",
  new_invoice: "invoice",
  deadline_extended: "invoice",
};

export function resolveNotificationCategory(type: string | undefined): NotificationCategory {
  if (!type) return "general";
  return CATEGORY_BY_TYPE[type] ?? CATEGORY_BY_TYPE[type.toLowerCase()] ?? "general";
}

export function getNotificationPresentation(
  notification: Pick<NotificationItem, "type">
): NotificationPresentation {
  return PRESENTATIONS[resolveNotificationCategory(notification.type)];
}

/** Icon for a notification, chosen by its event kind. Rejections get an
 * explicit cross so a decline is never mistaken for an approval. */
export function getNotificationIcon(type: string | undefined): LucideIcon {
  if (type === "invoice_rejected" || type === "kyc_rejected") {
    return XCircle;
  }
  return getNotificationPresentation({ type }).icon;
}

/** The text shown as the notification headline. */
export function getNotificationTitle(notification: NotificationItem): string {
  return notification.title ?? notification.message ?? getNotificationPresentation(notification).fallbackTitle;
}

/**
 * Resolves where clicking a notification should take the user: the explicit
 * link always wins, then an invoice-scoped route, then the category default.
 * Returns null when the notification has no meaningful destination.
 */
export function resolveNotificationRoute(notification: NotificationItem): string | null {
  if (notification.link) return notification.link;

  // Approval and rejection notices name their invoice, so the detail page is a
  // more useful destination than the category default.
  if (notification.invoice_id) {
    return `/marketplace/${notification.invoice_id}`;
  }

  return getNotificationPresentation(notification).defaultRoute;
}

export { PRESENTATIONS as NOTIFICATION_PRESENTATIONS };
