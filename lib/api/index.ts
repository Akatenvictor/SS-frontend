export interface Invoice {
  id: string;
  title: string;
  seller: string;
  amount: number;
  raised: number;
  investor_count: number;
  status: "open" | "funded" | "settled" | "rejected" | "draft";
  due_date: string;
  rejection_reason?: string;
  has_more: boolean;
  next_cursor: string | null;
  /** Annualised yield in basis points, published once the invoice is priced. */
  yield_bps?: number;
  /** Issuer reputation 0-100; absent when the issuer has no settlement history. */
  issuer_score?: number;
}

export interface InvoiceDetail extends Invoice {
  description: string;
  investors: { address: string; amount: number; timestamp: string }[];
  document_url: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
  next_cursor: string | null;
}

import type { InvestmentPosition } from "@/lib/portfolio";
import type { IssuerProfile } from "@/lib/issuers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Raised by API helpers when the server reports the resource is absent, so
 * callers can render a 404 state instead of a generic failure.
 */
export class ApiNotFoundError extends Error {
  readonly status: number;

  constructor(message = "Not found") {
    super(message);
    this.name = "ApiNotFoundError";
    this.status = 404;
  }
}

export async function fetchInvoices(cursor?: string): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/invoices?${params}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`${API_BASE}/invoices/${id}`);
  if (res.status === 404) throw new ApiNotFoundError("Invoice not found");
  if (!res.ok) throw new Error("Failed to fetch invoice detail");
  return res.json();
}

/** Fetches a public issuer profile, including its full invoice history. */
export async function fetchIssuerProfile(id: string): Promise<IssuerProfile> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new ApiNotFoundError("Issuer not found");
  if (!res.ok) throw new Error("Failed to fetch issuer profile");
  return res.json();
}

export async function investInInvoice(
  invoiceId: string,
  amount: number
): Promise<{ success: boolean; invested_amount: number }> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/invest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Investment failed");
  return res.json();
}

export type NotificationEventType = "new_invoice" | "funding_milestone" | "settlement";
export type NotificationChannel = "email" | "in_app";

export interface NotificationPreference {
  event_type: NotificationEventType;
  email: boolean;
  in_app: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await fetch(`${API_BASE}/notifications/preferences`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

/**
 * Email-only notification settings for the user settings page.
 *
 * Deliberately a separate union from {@link NotificationEventType}: that type
 * backs the per-channel dashboard toggles, and widening it would force every
 * existing consumer to handle channel combinations the settings page has no
 * concept of.
 */
export type EmailNotificationType =
  | "settlement"
  | "kyc_status"
  | "watchlist_invoice_match"
  | "secondary_market_sale"
  | "invoice_decision";

export interface EmailNotificationPreference {
  event_type: EmailNotificationType;
  email: boolean;
}

export async function fetchEmailNotificationPreferences(): Promise<EmailNotificationPreference[]> {
  const res = await fetch(`${API_BASE}/notifications/preferences/email`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

/** Persists every email toggle in one request; the UI saves as a batch. */
export async function saveEmailNotificationPreferences(
  preferences: EmailNotificationPreference[]
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/preferences/email`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error("Failed to save notification preferences");
  return res.json();
}

export interface IpfsUploadResult {
  cid: string;
  url: string;
}

export async function uploadDocumentToIpfs(file: File): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Document upload failed");
  return res.json();
}

export interface PublishInvoiceInput {
  title: string;
  description: string;
  faceValue: number;
  fundingDeadline: string;
  documentCid: string;
}

export interface PublishInvoiceResult {
  id: string;
}

export async function publishInvoice(
  input: PublishInvoiceInput
): Promise<PublishInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to publish invoice");
  return res.json();
}

export interface PortfolioResponse {
  positions: InvestmentPosition[];
}

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE}/investor/portfolio`);
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export interface SellerDashboardData {
  total_invoices: number;
  total_funded: number;
  total_settled: number;
  total_raised: number;
  invoices: Invoice[];
}

export async function fetchSellerDashboard(): Promise<SellerDashboardData> {
  const res = await fetch(`${API_BASE}/seller/analytics`);
  if (!res.ok) throw new Error("Failed to fetch seller dashboard");
  return res.json();
}

export async function submitKyc(data: FormData): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kyc/submit`, {
    method: "POST",
    body: data,
  });
  if (!res.ok) throw new Error("KYC submission failed");
  return res.json();
}

export async function updateNotificationPreference(
  eventType: NotificationEventType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/preferences/${eventType}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, enabled }),
  });
  if (!res.ok) throw new Error("Failed to update notification preference");
  return res.json();
}
