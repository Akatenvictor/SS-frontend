export interface Invoice {
  id: string;
  title: string;
  seller: string;
  amount: number;
  raised: number;
  investor_count: number;
  status: "draft" | "pending" | "open" | "funded" | "settled" | "rejected";
  due_date: string;
  yield_percentage?: number;
  rejection_reason?: string;
  /** Risk grade (A = safest). Used to gate investing by suitability tier (#391). */
  risk_rating?: { tier: "A" | "B" | "C" | "D"; score?: number };
  has_more: boolean;
  next_cursor: string | null;
  /** Issuer reputation 0-100; absent when the issuer has no settlement history. */
  issuer_score?: number;
}

export interface InvoiceDetail extends Invoice {
  description: string;
  investors: { address: string; amount: number; timestamp: string }[];
  document_url: string;
  /** Any supporting documents beyond the primary one. */
  documents?: string[];
  early_repayment?: {
    amount: number;
    original_maturity_date: string;
    new_settlement_date: string;
  };
  risk_rating?: {
    tier: "A" | "B" | "C" | "D";
    score: number;
    breakdown: {
      seller_history: number;
      invoice_age: number;
      amount: number;
      sector: number;
    };
  };
}

export interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ProtocolStatus {
  min_investment: number;
  [key: string]: unknown;
}

import { helperFunction142 } from "@/lib/utils";
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

export interface FeatureComponent142Input {
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureComponent142State {
  label: string;
  metadata: Record<string, unknown>;
  ready: boolean;
}

export function FeatureComponent142(
  input: FeatureComponent142Input = {}
): FeatureComponent142State {
  const label = helperFunction142(input.label ?? "New Feature 142");

  return {
    label,
    metadata: input.metadata ?? {},
    ready: label.length > 0,
  };
}

export async function fetchInvoices(
  cursor?: string,
  paramsObj?: Record<string, string>
): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (paramsObj) {
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
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

/** Protocol-wide status, including the minimum investment floor the contract
 * enforces (issue #116) ? must be read from here rather than hardcoded, since
 * it can change independently of any one invoice. */
export async function fetchProtocolStatus(): Promise<ProtocolStatus> {
  const res = await fetch(`${API_BASE}/protocol/status`);
  if (!res.ok) throw new Error("Failed to fetch protocol status");
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

/** Submits the `transfer_position` contract call (issue #119) ? sells an
 * investor's funded-invoice position to `buyer` for `salePriceXlm`. */
export async function transferInvoicePosition(
  invoiceId: string,
  buyer: string,
  salePriceXlm: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/transfer-position`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      buyer,
      sale_price: salePriceXlm,
      wallet: walletAddress,
    }),
  });
  if (!res.ok) throw new Error("Failed to transfer position");
  return res.json();
}

export type NotificationEventType =
  | "new_invoice"
  | "funding_milestone"
  | "settlement"
  | "invoice_funded"
  | "invoice_settled"
  | "invoice_matured"
  | "invoice_rejected"
  | "deadline_extended";
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

export async function uploadDocumentToIpfs(file: File, token?: string): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    headers: authHeaders(token),
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
  input: PublishInvoiceInput,
  token?: string
): Promise<PublishInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to publish invoice");
  return res.json();
}

/**
 * Submit a draft invoice for admin review, moving it from `draft` to `pending`.
 */
export async function submitDraftInvoice(
  id: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Failed to submit invoice for review");
  return res.json();
}

/**
 * Permanently delete a draft invoice. Only drafts are deletable — once an
 * invoice is under review or live it has to be resolved, not removed.
 */
export async function deleteDraftInvoice(
  id: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete draft invoice");
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
  display_name?: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  royalty_earnings?: number;
}

export interface RoyaltyEarning {
  id: string;
  invoice_id: string;
  invoice_title: string;
  transfer_date: string;
  transfer_amount: number;
  royalty_earned: number;
  claimed: boolean;
  claimed_at?: string;
  transaction_hash?: string;
}

export interface RoyaltyEarningsResponse {
  total_earnings: number;
  claimable_earnings: number;
  earnings: RoyaltyEarning[];
}

export async function fetchSellerDashboard(): Promise<SellerDashboardData> {
  const res = await fetch(`${API_BASE}/seller/analytics`);
  if (!res.ok) throw new Error("Failed to fetch seller dashboard");
  return res.json();
}

export async function fetchRoyaltyEarnings(): Promise<RoyaltyEarningsResponse> {
  const res = await fetch(`${API_BASE}/seller/royalty-earnings`);
  if (!res.ok) throw new Error("Failed to fetch royalty earnings");
  return res.json();
}

export async function claimRoyalties(): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(`${API_BASE}/seller/claim-royalties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to claim royalties");
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

export type SellerKycStatusValue =
  | "pending"
  | "rejected"
  | "approved"
  | "requires_resubmission"
  | "not_submitted";

export interface SellerKycStatus {
  status: SellerKycStatusValue;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  reason?: string | null;
}

function normalizeSellerKycStatus(raw: any): SellerKycStatus {
  return {
    status: raw.status ?? raw.kyc_status ?? raw.kycStatus ?? "not_submitted",
    rejection_reason:
      raw.rejection_reason ?? raw.rejectionReason ?? raw.reason ?? null,
  };
}

export async function fetchSellerKycStatus(
  token?: string
): Promise<SellerKycStatus> {
  const res = await fetch(`${API_BASE}/kyc/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return normalizeSellerKycStatus(await res.json());
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

/* ─── Notification centre (issue #283) ──────────────────────────────────── */

export interface NotificationItem {
  id: string;
  /** Short notification title, e.g. "Invoice fully funded". */
  title?: string;
  /** Alternative message field some backend versions return. */
  message?: string;
  /** Optional longer body text. */
  body?: string;
  /** Where clicking the notification should navigate, e.g. /marketplace/123. */
  link?: string;
  /**
   * Event kind driving the icon, copy and default route in the notification
   * centre (issue #377): settlement, kyc, listing, invoice or general.
   */
  type?: string;
  /** Related invoice, when the notification is about one. */
  invoice_id?: string;
  read: boolean;
  created_at?: string;
}

/**
 * Backends have shipped the event kind under several names (`type`,
 * `event_type`, `eventType`) and the read flag under both `read` and
 * `is_read`, so responses are normalised once here instead of at every
 * call site.
 */
export function normalizeNotification(raw: any): NotificationItem {
  return {
    ...raw,
    id: raw.id,
    title: raw.title ?? undefined,
    message: raw.message ?? undefined,
    body: raw.body ?? raw.description ?? undefined,
    link: raw.link ?? raw.url ?? undefined,
    type: raw.type ?? raw.event_type ?? raw.eventType ?? undefined,
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? undefined,
    read: Boolean(raw.read ?? raw.is_read ?? false),
    created_at: raw.created_at ?? raw.createdAt ?? undefined,
  };
}

/** Newest first — the order the notification centre renders in. */
export function sortNotificationsByRecency(
  notifications: NotificationItem[]
): NotificationItem[] {
  return [...notifications].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    // Items with no timestamp sort last rather than jumping to the top.
    if (a.created_at && !b.created_at) return -1;
    if (!a.created_at && b.created_at) return 1;
    return bTime - aTime;
  });
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const payload = await res.json();
  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.notifications)
      ? payload.notifications
      : [];
  return sortNotificationsByRecency(list.map(normalizeNotification));
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/notifications/unread-count`);
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return res.json();
}

/* ─── Settled-invoice pro-rata returns (issue #284) ─────────────────────── */

export interface InvoiceReturnRow {
  investor_wallet: string;
  /** Share of the invoice principal, in percent (0–100). */
  share_percentage: number;
  principal_invested: number;
  return_amount: number;
  net_profit: number;
}

export interface InvoiceReturnsResponse {
  invoice_id: string;
  /** Backend calculation method the frontend must mirror in tooltips. */
  calculation: "floor_division" | string;
  settled_at: string;
  total_return_amount: number;
  returns: InvoiceReturnRow[];
}

export async function fetchInvoiceReturns(
  invoiceId: string
): Promise<InvoiceReturnsResponse> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/returns`);
  if (!res.ok) throw new Error("Failed to fetch invoice returns");
  return res.json();
}

export interface AdminInvoiceRow {
  invoiceId: string;
  sellerName: string;
  faceValue: number;
  submittedAt: string;
  documentUrl?: string;
  status: string;
}

export interface AdminInvoicesResponse {
  invoices: AdminInvoiceRow[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchAdminInvoices(
  status = "pending",
  cursor?: string,
  token?: string
): Promise<AdminInvoicesResponse> {
  const params = new URLSearchParams({ status });
  if (cursor) params.set("cursor", cursor);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices?${params}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch admin invoices");
  return res.json();
}

export async function approveAdminInvoice(
  invoiceId: string,
  token?: string
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/approve`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to approve invoice");
  return res.json();
}

// ??? Settlement multi-sig (issue #118) ??????????????????????????????????????
//
// Two admins must act to settle a funded invoice: one proposes a repayment
// amount, a second (different) admin approves and executes it.

export interface SettlementProposal {
  id: string;
  amount: number;
  proposed_by: string;
  proposed_at: string;
}

export interface SettlementInvoiceRow {
  invoice_id: string;
  title: string;
  face_value: number;
  seller: string;
  proposal: SettlementProposal | null;
}

export interface SettlementsResponse {
  invoices: SettlementInvoiceRow[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Lists funded invoices awaiting settlement, each annotated with its open
 * proposal (if any) so the UI doesn't need one request per invoice. */
export async function fetchSettlements(
  cursor?: string,
  token?: string
): Promise<SettlementsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/admin/settlements?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch settlements");
  return res.json();
}

export async function proposeSettlement(
  invoiceId: string,
  amount: number,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/invoices/${invoiceId}/settlement/propose`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ amount }),
    }
  );
  if (!res.ok) throw new Error("Failed to propose settlement");
  return res.json();
}

/** Approves and executes a pending settlement proposal. The backend is the
 * source of truth for the "not your own proposal" rule ? a 403 here (e.g.
 * the proposing admin retrying via another tab) surfaces as this error. */
export async function approveSettlement(
  invoiceId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/invoices/${invoiceId}/settlement/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
    }
  );
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Cannot approve your own settlement proposal");
    }
    throw new Error("Failed to approve settlement");
  }
  return res.json();
}

export async function rejectAdminInvoice(
  invoiceId: string,
  reason: string,
  token?: string
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject invoice");
  return res.json();
}

export interface PayoutRecord {
  invoiceId: string;
  sellerName: string;
  amountInvested: number;
  amountReceived: number;
  yield: number;
  settledAt: string;
}

export interface PayoutsResponse {
  payouts: PayoutRecord[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchInvestorPayouts(
  cursor?: string
): Promise<PayoutsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/investor/payouts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch payout history");
  return res.json();
}

export interface CreatorKeyDetail {
  id: string;
  title: string;
  creator_name: string;
  description?: string;
  price: number;
  holders_count: number;
  whitelist_enabled: boolean;
  holder_balance?: number;
  is_holder?: boolean;
  is_creator?: boolean;
}

export interface GovernanceOption {
  label: string;
  vote_weight: number;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  status: "active" | "closed";
  expires_at: string;
  snapshot_ledger?: number;
  user_voting_weight?: number;
  user_has_voted?: boolean;
  winning_option_index?: number;
  winning_option?: string;
  options: GovernanceOption[];
}

export interface GovernanceProposalsResponse {
  proposals: GovernanceProposal[];
}

export interface WhitelistStatus {
  whitelist_enabled: boolean;
  is_approved: boolean;
}

export interface KeySupply {
  circulatingSupply: number;
  supplyCap: number | null;
  remainingMintable: number;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Reads a server-provided error message, falling back to a generic one. */
async function readConflictErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json();
    const message = payload?.message ?? payload?.error;
    return typeof message === "string" && message.length > 0 ? message : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCreatorKeyDetail(raw: any): CreatorKeyDetail {
  return {
    id: raw.id,
    title: raw.title ?? raw.name,
    creator_name: raw.creator_name ?? raw.creatorName ?? raw.creator ?? "",
    description: raw.description,
    price: raw.price ?? 0,
    holders_count: raw.holders_count ?? raw.holdersCount ?? 0,
    whitelist_enabled: raw.whitelist_enabled ?? raw.whitelistEnabled ?? false,
    holder_balance: raw.holder_balance ?? raw.holderBalance,
    is_holder: raw.is_holder ?? raw.isHolder,
    is_creator: raw.is_creator ?? raw.isCreator,
  };
}

function normalizeProposal(raw: any): GovernanceProposal {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    expires_at: raw.expires_at ?? raw.expiresAt,
    snapshot_ledger: raw.snapshot_ledger ?? raw.snapshotLedger,
    user_voting_weight: raw.user_voting_weight ?? raw.userVotingWeight,
    user_has_voted: raw.user_has_voted ?? raw.userHasVoted,
    winning_option_index: raw.winning_option_index ?? raw.winningOptionIndex,
    winning_option: raw.winning_option ?? raw.winningOption,
    options: (raw.options ?? []).map((option: any) => ({
      label: option.label ?? option.title ?? option.name,
      vote_weight: option.vote_weight ?? option.voteWeight ?? option.votes ?? 0,
    })),
  };
}

function normalizeWhitelistStatus(raw: any): WhitelistStatus {
  return {
    whitelist_enabled: raw.whitelist_enabled ?? raw.whitelistEnabled ?? false,
    is_approved: raw.is_approved ?? raw.isApproved ?? false,
  };
}

function normalizeKeySupply(raw: any): KeySupply {
  const circulatingSupply =
    raw.circulatingSupply ?? raw.circulating_supply ?? raw.circulating ?? 0;
  const supplyCap = raw.supplyCap ?? raw.supply_cap ?? null;
  const remainingMintable =
    raw.remainingMintable ??
    raw.remaining_mintable ??
    (supplyCap === null ? 0 : Math.max(supplyCap - circulatingSupply, 0));

  return {
    circulatingSupply,
    supplyCap,
    remainingMintable,
  };
}

export async function fetchCreatorKeyDetail(
  keyId: string,
  token?: string
): Promise<CreatorKeyDetail> {
  const res = await fetch(`${API_BASE}/keys/${keyId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch key detail");
  return normalizeCreatorKeyDetail(await res.json());
}

export async function fetchKeyProposals(
  keyId: string,
  status: "active" | "closed",
  token?: string
): Promise<GovernanceProposalsResponse> {
  const params = new URLSearchParams({ status });
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch governance proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload) ? payload : payload.proposals ?? [];
  return { proposals: proposals.map(normalizeProposal) };
}

export async function fetchKeyWhitelistStatus(
  keyId: string,
  walletAddress: string,
  token?: string
): Promise<WhitelistStatus> {
  const params = new URLSearchParams({ wallet: walletAddress });
  const res = await fetch(`${API_BASE}/keys/${keyId}/whitelist?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch whitelist status");
  return normalizeWhitelistStatus(await res.json());
}

export async function fetchKeySupply(
  keyId: string,
  token?: string
): Promise<KeySupply> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/supply`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch key supply");
  return normalizeKeySupply(await res.json());
}

export async function buyCreatorKey(
  keyId: string,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to buy key");
  return res.json();
}

export async function castGovernanceVote(
  keyId: string,
  proposalId: string,
  optionIndex: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals/${proposalId}/votes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ optionIndex, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to cast vote");
  return res.json();
}

export interface BurnKeyResult {
  success: boolean;
  circulatingSupply: number | null;
}

export async function burnCreatorKey(
  keyId: string,
  quantity: number,
  walletAddress: string,
  token?: string
): Promise<BurnKeyResult> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/burn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ quantity, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to burn key");

  const payload = await res.json();
  const circulatingSupply =
    payload?.circulatingSupply ??
    payload?.circulating_supply ??
    payload?.supply?.circulatingSupply ??
    payload?.supply?.circulating_supply ??
    null;

  return {
    success: payload?.success ?? true,
    circulatingSupply:
      typeof circulatingSupply === "number" ? circulatingSupply : null,
  };
}

export interface CreateProposalInput {
  title: string;
  options: string[];
  durationDays: number;
}

export async function createGovernanceProposal(
  keyId: string,
  input: CreateProposalInput,
  walletAddress: string,
  token?: string
): Promise<GovernanceProposal> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      title: input.title,
      options: input.options,
      durationDays: input.durationDays,
      wallet: walletAddress,
    }),
  });
  if (!res.ok) throw new Error("Failed to create proposal");
  return normalizeProposal(await res.json());
}

export async function transferCreatorKey(
  keyId: string,
  recipient: string,
  quantity: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ recipient, quantity, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to transfer key");
  return res.json();
}

export interface VestingSchedule {
  keyId: string;
  keyTitle?: string;
  totalKeys: number;
  vestedAmount: number;
  claimedAmount?: number;
  claimableAmount: number;
  startDate?: string | null;
  endDate?: string | null;
  vestingEndsAt?: string | null;
}

function normalizeVestingSchedule(raw: any, keyId: string): VestingSchedule {
  const endDate = raw.endDate ?? raw.end_date ?? null;
  return {
    keyId: raw.keyId ?? raw.key_id ?? keyId,
    keyTitle: raw.keyTitle ?? raw.key_title,
    totalKeys: raw.totalKeys ?? raw.total_keys ?? 0,
    vestedAmount: raw.vestedAmount ?? raw.vested_amount ?? 0,
    claimedAmount: raw.claimedAmount ?? raw.claimed_amount ?? 0,
    claimableAmount: raw.claimableAmount ?? raw.claimable_amount ?? 0,
    startDate: raw.startDate ?? raw.start_date ?? null,
    endDate,
    vestingEndsAt: raw.vestingEndsAt ?? raw.vesting_ends_at ?? endDate,
  };
}

export async function fetchVestingSchedule(
  keyId: string,
  walletAddress: string,
  token?: string
): Promise<VestingSchedule | null> {
  const res = await fetch(
    `${API_BASE}/vesting/${keyId}/${encodeURIComponent(walletAddress)}`,
    { headers: authHeaders(token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch vesting schedule");
  const payload = await res.json();
  if (!payload) return null;
  return normalizeVestingSchedule(payload, keyId);
}

export async function claimVestedKeys(
  keyId: string,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/vesting/${keyId}/${encodeURIComponent(walletAddress)}/claim`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({ wallet: walletAddress }),
    }
  );
  if (!res.ok) throw new Error("Failed to claim vested keys");
  return res.json();
}

export interface AuditLogEntry {
  id: string;
  actorWallet: string;
  actionType: string;
  targetId: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeAuditLogEntry(raw: any): AuditLogEntry {
  return {
    id: raw.id,
    actorWallet: raw.actorWallet ?? raw.actor_wallet ?? "",
    actionType: raw.actionType ?? raw.action_type ?? "",
    targetId: raw.targetId ?? raw.target_id ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    payload: raw.payload ?? raw,
  };
}

export async function fetchAuditLog(
  cursor?: string,
  actionType?: string,
  token?: string
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (actionType) params.set("actionType", actionType);

  const res = await fetch(`${API_BASE}/admin/audit-log?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch audit log");
  const payload = await res.json();
  const entries = Array.isArray(payload) ? payload : payload.entries ?? [];

  return {
    entries: entries.map(normalizeAuditLogEntry),
    has_more: payload.has_more ?? false,
    next_cursor: payload.next_cursor ?? null,
  };
}

export interface ApiConflictError extends Error {
  isConflict: true;
}

export function isApiConflictError(error: unknown): error is ApiConflictError {
  return (
    error instanceof Error &&
    (error as Partial<ApiConflictError>).isConflict === true
  );
}

function conflictError(message: string): ApiConflictError {
  const error = new Error(message) as ApiConflictError;
  error.name = "ApiConflictError";
  error.isConflict = true;
  return error;
}

export async function updateKeySupplyCap(
  keyId: string,
  supplyCap: number,
  token?: string
): Promise<KeySupply> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/supply`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ supplyCap }),
  });

  if (res.status === 409) {
    throw conflictError(
      await readConflictErrorMessage(
        res,
        "Supply cap conflicts with the current circulating supply"
      )
    );
  }
  if (!res.ok) throw new Error("Failed to update supply cap");

  return normalizeKeySupply(await res.json());
}

export interface MonthlyRevenue {
  month: string;
  royaltyEarned: number;
}

export interface CreatorRevenue {
  totalRoyaltyEarned: number;
  buyRoyaltyEarned: number;
  sellRoyaltyEarned: number;
  tradeCount: number;
  monthlyBreakdown: MonthlyRevenue[];
}

function normalizeMonthlyRevenue(raw: any): MonthlyRevenue {
  return {
    month: raw.month ?? raw.period ?? "",
    royaltyEarned: raw.royaltyEarned ?? raw.royalty_earned ?? 0,
  };
}

function normalizeCreatorRevenue(raw: any): CreatorRevenue {
  const monthly =
    raw.monthlyBreakdown ?? raw.monthly_breakdown ?? raw.monthly ?? [];

  return {
    totalRoyaltyEarned:
      raw.totalRoyaltyEarned ?? raw.total_royalty_earned ?? 0,
    buyRoyaltyEarned: raw.buyRoyaltyEarned ?? raw.buy_royalty_earned ?? 0,
    sellRoyaltyEarned: raw.sellRoyaltyEarned ?? raw.sell_royalty_earned ?? 0,
    tradeCount: raw.tradeCount ?? raw.trade_count ?? 0,
    monthlyBreakdown: monthly.map(normalizeMonthlyRevenue),
  };
}

export async function fetchCreatorRevenue(
  keyId: string,
  token?: string
): Promise<CreatorRevenue> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/revenue`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch creator revenue");
  return normalizeCreatorRevenue(await res.json());
}

export type TimelockProposalStatus = "pending" | "executed" | "cancelled";

export interface TimelockProposal {
  id: string;
  changeType: string;
  payload: Record<string, unknown>;
  proposedAt: string;
  executionNotBefore: string;
  status: TimelockProposalStatus;
  executedAt: string | null;
}

export interface TimelockProposalsResponse {
  proposals: TimelockProposal[];
}

function normalizeTimelockProposal(raw: any): TimelockProposal {
  const rawStatus = raw.status ?? (raw.executedAt || raw.executed_at ? "executed" : "pending");

  return {
    id: raw.id,
    changeType: raw.changeType ?? raw.change_type ?? "",
    payload: raw.payload ?? {},
    proposedAt: raw.proposedAt ?? raw.proposed_at ?? "",
    executionNotBefore:
      raw.executionNotBefore ?? raw.execution_not_before ?? "",
    status: rawStatus as TimelockProposalStatus,
    executedAt: raw.executedAt ?? raw.executed_at ?? null,
  };
}

export async function fetchTimelockProposals(
  token?: string
): Promise<TimelockProposalsResponse> {
  const res = await fetch(`${API_BASE}/admin/timelock/proposals`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch timelock proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload) ? payload : payload.proposals ?? [];
  return { proposals: proposals.map(normalizeTimelockProposal) };
}

export async function executeTimelockProposal(
  proposalId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  if (!res.ok) throw new Error("Failed to execute timelock proposal");
  return res.json();
}

export async function cancelTimelockProposal(
  proposalId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  if (!res.ok) throw new Error("Failed to cancel timelock proposal");
  return res.json();
}

export interface DividendDistributionResult {
  totalDistributed: number;
  perKeyAmount: number;
  holderCount: number;
}

function normalizeDividendResult(
  raw: any,
  fallbackAmount: number
): DividendDistributionResult {
  return {
    totalDistributed:
      raw.totalDistributed ?? raw.total_distributed ?? fallbackAmount,
    perKeyAmount: raw.perKeyAmount ?? raw.per_key_amount ?? 0,
    holderCount: raw.holderCount ?? raw.holder_count ?? 0,
  };
}

export async function distributeDividend(
  keyId: string,
  amount: number,
  walletAddress: string,
  token?: string
): Promise<DividendDistributionResult> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/distribute-dividend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ amount, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Dividend distribution failed");
  return normalizeDividendResult(await res.json(), amount);
}

export type WalletActivityType =
  | "buy"
  | "sell"
  | "transfer"
  | "burn"
  | "dividend";

export interface WalletActivityEvent {
  id: string;
  type: WalletActivityType;
  keyId?: string;
  keyName: string;
  amount: number;
  createdAt: string;
  counterparty?: string;
  direction?: "in" | "out";
}

export interface WalletActivityResponse {
  events: WalletActivityEvent[];
  has_more: boolean;
  next_cursor: string | null;
}

const WALLET_ACTIVITY_TYPES: WalletActivityType[] = [
  "buy",
  "sell",
  "transfer",
  "burn",
  "dividend",
];

function normalizeActivityType(raw: any): WalletActivityType {
  const value = String(raw ?? "").toLowerCase();
  return WALLET_ACTIVITY_TYPES.includes(value as WalletActivityType)
    ? (value as WalletActivityType)
    : "transfer";
}

function normalizeWalletActivityEvent(raw: any): WalletActivityEvent {
  return {
    id: raw.id ?? raw.event_id ?? raw.eventId ?? "",
    type: normalizeActivityType(raw.type ?? raw.event_type ?? raw.eventType),
    keyId: raw.keyId ?? raw.key_id ?? undefined,
    keyName:
      raw.keyName ?? raw.key_name ?? raw.key_title ?? raw.keyTitle ?? "Key",
    amount: Number(raw.amount ?? raw.quantity ?? 0),
    createdAt: raw.createdAt ?? raw.created_at ?? raw.timestamp ?? "",
    counterparty: raw.counterparty ?? raw.counter_party ?? undefined,
    direction: raw.direction ?? undefined,
  };
}

export async function fetchWalletActivity(
  address: string,
  cursor?: string,
  token?: string
): Promise<WalletActivityResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/wallets/${encodeURIComponent(address)}/activity?${params}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch wallet activity");

  const payload = await res.json();
  const events = Array.isArray(payload)
    ? payload
    : payload.events ?? payload.activity ?? [];

  return {
    events: events.map(normalizeWalletActivityEvent),
    has_more: payload.has_more ?? payload.hasMore ?? false,
    next_cursor: payload.next_cursor ?? payload.nextCursor ?? null,
  };
}

export interface WhitelistEntry {
  address: string;
  addedAt?: string;
}

export interface WhitelistResponse {
  entries: WhitelistEntry[];
  whitelist_enabled: boolean;
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeWhitelistEntry(raw: any): WhitelistEntry {
  if (typeof raw === "string") return { address: raw };
  return {
    address: raw.address ?? raw.wallet ?? "",
    addedAt: raw.addedAt ?? raw.added_at ?? undefined,
  };
}

export async function fetchKeyWhitelist(
  keyId: string,
  cursor?: string,
  token?: string
): Promise<WhitelistResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/creator/${keyId}/whitelist?${params}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch whitelist");

  const payload = await res.json();
  const entries = Array.isArray(payload)
    ? payload
    : payload.entries ?? payload.addresses ?? [];

  return {
    entries: entries.map(normalizeWhitelistEntry),
    whitelist_enabled:
      payload.whitelist_enabled ?? payload.whitelistEnabled ?? false,
    has_more: payload.has_more ?? payload.hasMore ?? false,
    next_cursor: payload.next_cursor ?? payload.nextCursor ?? null,
  };
}

export async function addWhitelistAddress(
  keyId: string,
  address: string,
  token?: string
): Promise<WhitelistEntry> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to add address to whitelist");
  return normalizeWhitelistEntry(await res.json());
}

export async function removeWhitelistAddress(
  keyId: string,
  address: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to remove address from whitelist");
  return res.json();
}

export async function updateWhitelistMode(
  keyId: string,
  enabled: boolean,
  token?: string
): Promise<{ whitelist_enabled: boolean }> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to update whitelist mode");

  const payload = await res.json();
  return {
    whitelist_enabled:
      payload.whitelist_enabled ?? payload.whitelistEnabled ?? enabled,
  };
}

export type KeyTradingStatus = "active" | "pause_pending" | "paused";

export interface PauseProposal {
  keyId: string;
  proposedBy: string;
  proposedAt: string;
}

export interface AdminKeyControl {
  keyId: string;
  keyTitle: string;
  tradingStatus: KeyTradingStatus;
  pendingProposal: PauseProposal | null;
}

export interface AdminKeyControlsResponse {
  keys: AdminKeyControl[];
}

function normalizePauseProposal(raw: any, keyId: string): PauseProposal | null {
  if (!raw) return null;
  return {
    keyId: raw.keyId ?? raw.key_id ?? keyId,
    proposedBy: raw.proposedBy ?? raw.proposed_by ?? raw.proposer ?? "",
    proposedAt: raw.proposedAt ?? raw.proposed_at ?? raw.created_at ?? "",
  };
}

function normalizeAdminKeyControl(raw: any): AdminKeyControl {
  const keyId = raw.keyId ?? raw.key_id ?? raw.id ?? "";
  const pendingProposal = normalizePauseProposal(
    raw.pendingProposal ?? raw.pending_proposal ?? raw.pause_proposal,
    keyId
  );
  const rawStatus = String(
    raw.tradingStatus ?? raw.trading_status ?? raw.status ?? ""
  ).toLowerCase();

  const tradingStatus: KeyTradingStatus =
    rawStatus === "paused"
      ? "paused"
      : pendingProposal
        ? "pause_pending"
        : "active";

  return {
    keyId,
    keyTitle: raw.keyTitle ?? raw.key_title ?? raw.title ?? raw.name ?? keyId,
    tradingStatus,
    pendingProposal,
  };
}

export async function fetchAdminKeyControls(
  token?: string
): Promise<AdminKeyControlsResponse> {
  const res = await fetch(`${API_BASE}/admin/keys`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch trading controls");

  const payload = await res.json();
  const keys = Array.isArray(payload) ? payload : payload.keys ?? [];

  return { keys: keys.map(normalizeAdminKeyControl) };
}

export async function proposeKeyPause(
  keyId: string,
  token?: string
): Promise<AdminKeyControl> {
  const res = await fetch(`${API_BASE}/admin/keys/${keyId}/pause/propose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to propose pause"));
  }
  return normalizeAdminKeyControl(await res.json());
}

export async function approveKeyPause(
  keyId: string,
  token?: string
): Promise<AdminKeyControl> {
  const res = await fetch(`${API_BASE}/admin/keys/${keyId}/pause/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to approve pause"));
  }
  return normalizeAdminKeyControl(await res.json());
}
// #305 — Admin user management: searchable user table with role assignment
// and suspension controls.

export type AdminUserRole = "user" | "seller" | "admin";

export interface AdminUserRow {
  wallet: string;
  role: AdminUserRole;
  suspended: boolean;
  joined_at: string;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchAdminUsers(
  search = "",
  cursor?: string,
  token?: string
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/admin/users?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch users"));
  }
  return res.json();
}

export async function updateAdminUserRole(
  wallet: string,
  role: AdminUserRole,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to update role"));
  }
  return res.json();
}

export async function suspendAdminUser(
  wallet: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/suspend`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to suspend user"));
  }
  return res.json();
}

export async function unsuspendAdminUser(
  wallet: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/unsuspend`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to unsuspend user"));
  }
  return res.json();
}

// #319 — Public creator profile: issued invoices, funding stats, and
// settlement track record. Public endpoints; no wallet connection required.

export interface CreatorProfileStats {
  total_invoices: number;
  total_funded: number;
  settlement_success_rate: number;
}

export interface CreatorProfileInvoice {
  id: string;
  title: string;
  amount: number;
  funded_amount: number;
  status: Invoice["status"];
  created_at: string;
}

export interface CreatorProfileResponse {
  wallet: string;
  display_name?: string | null;
  displayName?: string | null;
  joined_at: string;
  joinedAt?: string;
  kyc_verified: boolean;
  kycVerified?: boolean;
  stats: CreatorProfileStats;
  invoices: CreatorProfileInvoice[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeCreatorProfile(raw: any): CreatorProfileResponse {
  return {
    wallet: raw.wallet ?? raw.address ?? "",
    display_name: raw.display_name ?? raw.displayName ?? null,
    joined_at: raw.joined_at ?? raw.joinedAt ?? raw.created_at ?? "",
    kyc_verified: Boolean(raw.kyc_verified ?? raw.kycVerified),
    stats: {
      total_invoices: raw.stats?.total_invoices ?? raw.total_invoices ?? 0,
      total_funded: raw.stats?.total_funded ?? raw.total_funded ?? 0,
      settlement_success_rate:
        raw.stats?.settlement_success_rate ?? raw.settlement_success_rate ?? 0,
    },
    invoices: raw.invoices ?? [],
    has_more: Boolean(raw.has_more),
    next_cursor: raw.next_cursor ?? null,
  };
}

export async function fetchCreatorProfile(
  wallet: string,
  cursor?: string
): Promise<CreatorProfileResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/creators/${wallet}?${params}`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch creator profile"));
  }
  return normalizeCreatorProfile(await res.json());
}

// ─── Leaderboard (top investors) ──────────────────────────────────────────
// NB: useLeaderboard imports this; provide a tolerant normalizer so snake_case
// and camelCase backend payloads both work.

export interface LeaderboardInvestor {
  address: string;
  total_committed: number;
  invoice_count: number;
}

function normalizeLeaderboardInvestor(raw: any): LeaderboardInvestor {
  return {
    address:
      raw.address ?? raw.wallet ?? raw.wallet_address ?? raw.walletAddress ?? "",
    total_committed:
      raw.total_committed ?? raw.totalCommitted ?? raw.total ?? 0,
    invoice_count:
      raw.invoice_count ?? raw.invoiceCount ?? raw.invoices_count ?? 0,
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardInvestor[]> {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const payload = await res.json();
  const list = Array.isArray(payload) ? payload : payload.investors ?? [];
  return list.map(normalizeLeaderboardInvestor);
}

// ─── Investor reputation (#342) ───────────────────────────────────────────

export type ReputationTier = "Verified" | "Trusted" | "New";

export function getReputationTier(score: number): ReputationTier {
  if (score >= 800) return "Verified";
  if (score >= 500) return "Trusted";
  return "New";
}

export interface ReputationScoreHistoryPoint {
  date: string;
  score: number;
}

export interface InvestorReputation {
  wallet: string;
  score: number;
  tier: ReputationTier;
  investments_completed: number;
  governance_votes: number;
  platform_tenure_days: number;
  history: ReputationScoreHistoryPoint[];
}

function normalizeReputationHistory(raw: any): ReputationScoreHistoryPoint[] {
  const list = Array.isArray(raw) ? raw : raw?.history ?? raw?.points ?? [];
  return (Array.isArray(list) ? list : []).map((p: any) => ({
    date: String(p.date ?? p.timestamp ?? p.created_at ?? ""),
    score: Number(p.score ?? p.value ?? 0),
  }));
}

function normalizeInvestorReputation(raw: any, wallet: string): InvestorReputation {
  const score = Number(
    raw.score ?? raw.reputation_score ?? raw.reputationScore ?? 0
  );
  const breakdown = raw.breakdown ?? raw;
  return {
    wallet: raw.wallet ?? raw.address ?? wallet,
    score,
    tier: (raw.tier as ReputationTier) ?? getReputationTier(score),
    investments_completed: Number(
      raw.investments_completed ??
        breakdown.investments_completed ??
        breakdown.investmentsCompleted ??
        raw.investmentsCompleted ??
        0
    ),
    governance_votes: Number(
      raw.governance_votes ??
        breakdown.governance_votes ??
        breakdown.governanceVotes ??
        raw.governanceVotes ??
        0
    ),
    platform_tenure_days: Number(
      raw.platform_tenure_days ??
        breakdown.platform_tenure_days ??
        breakdown.platformTenureDays ??
        raw.platformTenureDays ??
        raw.tenure_days ??
        0
    ),
    history: normalizeReputationHistory(raw.history ?? raw.score_history ?? raw),
  };
}

export async function fetchInvestorReputation(
  wallet: string
): Promise<InvestorReputation> {
  const res = await fetch(
    `${API_BASE}/investors/${encodeURIComponent(wallet)}/reputation`
  );
  if (!res.ok) throw new Error("Failed to fetch investor reputation");
  return normalizeInvestorReputation(await res.json(), wallet);
}

// ─── Platform activity feed (#341) ────────────────────────────────────────

export type PlatformActivityEventType =
  | "new_investment"
  | "invoice_funded"
  | "invoice_settled"
  | "new_listing";

export interface PlatformActivityEvent {
  id: string;
  type: PlatformActivityEventType;
  invoice_id: string;
  title: string;
  amount?: number;
  created_at: string;
}

const PLATFORM_ACTIVITY_TYPES: PlatformActivityEventType[] = [
  "new_investment",
  "invoice_funded",
  "invoice_settled",
  "new_listing",
];

function normalizePlatformActivityType(raw: any): PlatformActivityEventType {
  const v = String(raw ?? "").toLowerCase();
  if ((PLATFORM_ACTIVITY_TYPES as string[]).includes(v))
    return v as PlatformActivityEventType;
  // Tolerate backend aliases.
  if (v === "investment" || v === "new investment") return "new_investment";
  if (v === "funded" || v === "invoice fully funded") return "invoice_funded";
  if (v === "settled" || v === "settlement") return "invoice_settled";
  if (v === "listing" || v === "new invoice") return "new_listing";
  return "new_listing";
}

function normalizePlatformActivityEvent(raw: any): PlatformActivityEvent {
  return {
    id: String(raw.id ?? raw.event_id ?? raw.eventId ?? ""),
    type: normalizePlatformActivityType(
      raw.type ?? raw.event_type ?? raw.eventType
    ),
    invoice_id: String(
      raw.invoice_id ?? raw.invoiceId ?? raw.invoice ?? ""
    ),
    title: String(raw.title ?? raw.invoice_title ?? raw.description ?? ""),
    amount:
      raw.amount !== undefined && raw.amount !== null
        ? Number(raw.amount)
        : undefined,
    created_at: String(
      raw.created_at ?? raw.createdAt ?? raw.timestamp ?? ""
    ),
  };
}

export async function fetchPlatformActivity(
  limit = 20
): Promise<PlatformActivityEvent[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}/activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch platform activity");
  const payload = await res.json();
  const events = Array.isArray(payload)
    ? payload
    : payload.events ?? payload.activity ?? [];
  return events
    .map(normalizePlatformActivityEvent)
    .slice(0, limit);
}

// ─── Sell tax + buyback pool (#343) ───────────────────────────────────────

export interface InvoiceProtectionInfo {
  invoice_id: string;
  sell_tax_percentage: number;
  buyback_pool_balance: number;
}

function normalizeProtectionInfo(raw: any, invoiceId: string): InvoiceProtectionInfo {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    sell_tax_percentage: Number(
      raw.sell_tax_percentage ?? raw.sellTaxPercentage ?? raw.sell_tax ?? 0
    ),
    buyback_pool_balance: Number(
      raw.buyback_pool_balance ??
        raw.buybackPoolBalance ??
        raw.buyback_pool ??
        0
    ),
  };
}

export async function fetchInvoiceProtection(
  invoiceId: string
): Promise<InvoiceProtectionInfo> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/protection`
  );
  if (!res.ok) throw new Error("Failed to fetch sell tax info");
  return normalizeProtectionInfo(await res.json(), invoiceId);
}

/** Sell tax percentage for an invoice (issue #343). */
export async function fetchSellTax(invoiceId: string): Promise<number> {
  const info = await fetchInvoiceProtection(invoiceId);
  return info.sell_tax_percentage;
}

/** Buyback pool balance in XLM (issue #343). */
export async function fetchBuybackPool(invoiceId: string): Promise<number> {
  const info = await fetchInvoiceProtection(invoiceId);
  return info.buyback_pool_balance;
}

// ─── Dynamic fee tier (#345) ──────────────────────────────────────────────

export interface FeeTierEntry {
  tier: string;
  min_volume: number;
  fee_percentage: number;
}

export interface FeeTierInfo {
  fee_percentage: number;
  tier_label: string;
  volume_24h: number;
  tiers: FeeTierEntry[];
  is_lowest_tier: boolean;
}

export const FEE_TIERS: FeeTierEntry[] = [
  { tier: "Standard", min_volume: 0, fee_percentage: 2.5 },
  { tier: "Silver", min_volume: 100_000, fee_percentage: 2.0 },
  { tier: "Gold", min_volume: 500_000, fee_percentage: 1.5 },
  { tier: "Platinum", min_volume: 1_000_000, fee_percentage: 1.0 },
];

function normalizeFeeTierEntry(raw: any): FeeTierEntry {
  return {
    tier: String(raw.tier ?? raw.label ?? raw.name ?? ""),
    min_volume: Number(raw.min_volume ?? raw.minVolume ?? raw.threshold ?? 0),
    fee_percentage: Number(
      raw.fee_percentage ?? raw.feePercentage ?? raw.fee ?? 0
    ),
  };
}

function normalizeFeeTierInfo(raw: any): FeeTierInfo {
  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers.map(normalizeFeeTierEntry)
    : FEE_TIERS;
  const fee_percentage = Number(
    raw.fee_percentage ?? raw.feePercentage ?? raw.fee ?? 0
  );
  const tier_label = String(
    raw.tier_label ?? raw.tierLabel ?? raw.tier ?? ""
  );
  const volume_24h = Number(
    raw.volume_24h ?? raw.volume24h ?? raw.volume ?? 0
  );
  const lowestFee = Math.min(...tiers.map((t) => t.fee_percentage));
  return {
    fee_percentage,
    tier_label,
    volume_24h,
    tiers,
    is_lowest_tier:
      typeof raw.is_lowest_tier === "boolean"
        ? raw.is_lowest_tier
        : fee_percentage <= lowestFee,
  };
}

export async function fetchFeeTier(): Promise<FeeTierInfo> {
  const res = await fetch(`${API_BASE}/protocol/fee-tier`);
  if (!res.ok) throw new Error("Failed to fetch fee tier");
  return normalizeFeeTierInfo(await res.json());
}

/* ─── Secondary market — resale listings (issue #380) ────────────────────── */

export type ResaleListingStatus = "active" | "sold" | "cancelled";

/** Invoice categories a listing can be filtered by. */
export const RESALE_INVOICE_TYPES = [
  "trade_receivable",
  "supply_chain",
  "promissory_note",
  "equipment_lease",
  "service_contract",
] as const;

export type ResaleInvoiceType = (typeof RESALE_INVOICE_TYPES)[number];

export interface ResaleListing {
  id: string;
  invoice_id: string;
  invoice_title: string;
  /** Invoice category, used by the "invoice type" filter. */
  invoice_type: string;
  /** Wallet that listed the fractions. */
  seller: string;
  /** Fractions the seller originally listed. */
  quantity: number;
  /** Fractions still on offer — drops to 0 once sold out. */
  remaining_quantity: number;
  /** Ask price per fraction, in the asset's smallest unit. */
  ask_price: number;
  /** Value one fraction pays out at maturity; the basis for implied yield. */
  maturity_value: number;
  /** Maturity date of the underlying invoice (ISO 8601). */
  maturity_date: string;
  listed_at: string;
  status: ResaleListingStatus;
}

export interface ResaleListingsResponse {
  listings: ResaleListing[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Query parameters accepted by the listings endpoint. */
export interface ResaleListingFilters {
  invoiceType?: string;
  minYield?: number;
  maxYield?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Only listings maturing within this many days. */
  maxDaysToMaturity?: number;
}

function normalizeResaleListing(raw: any): ResaleListing {
  const quantity = Number(raw.quantity ?? raw.shares ?? raw.shares_offered ?? 0);
  const remaining = Number(
    raw.remaining_quantity ?? raw.remaining ?? raw.shares_remaining ?? quantity
  );

  return {
    id: String(raw.id ?? raw.listing_id),
    invoice_id: String(raw.invoice_id ?? raw.invoiceId ?? ""),
    invoice_title: String(raw.invoice_title ?? raw.invoiceTitle ?? raw.title ?? ""),
    invoice_type: String(raw.invoice_type ?? raw.invoiceType ?? "other"),
    seller: String(raw.seller ?? raw.seller_address ?? ""),
    quantity,
    remaining_quantity: remaining,
    ask_price: Number(raw.ask_price ?? raw.askPrice ?? raw.price ?? 0),
    maturity_value: Number(
      raw.maturity_value ?? raw.maturityValue ?? raw.face_value ?? 0
    ),
    maturity_date: String(raw.maturity_date ?? raw.maturityDate ?? raw.due_date ?? ""),
    listed_at: String(raw.listed_at ?? raw.listedAt ?? raw.created_at ?? ""),
    status: (raw.status ?? "active") as ResaleListingStatus,
  };
}

function buildResaleListingParams(filters: ResaleListingFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.invoiceType && filters.invoiceType !== "all") {
    params.set("invoice_type", filters.invoiceType);
  }
  if (filters.minYield !== undefined && filters.minYield > 0) {
    params.set("min_yield", String(filters.minYield));
  }
  if (filters.maxYield !== undefined && filters.maxYield > 0) {
    params.set("max_yield", String(filters.maxYield));
  }
  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    params.set("min_price", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    params.set("max_price", String(filters.maxPrice));
  }
  if (filters.maxDaysToMaturity !== undefined && filters.maxDaysToMaturity > 0) {
    params.set("max_days_to_maturity", String(filters.maxDaysToMaturity));
  }
  return params;
}

export async function fetchResaleListings(
  filters: ResaleListingFilters = {},
  signal?: AbortSignal
): Promise<ResaleListingsResponse> {
  const params = buildResaleListingParams(filters);
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/marketplace/listings${query ? `?${query}` : ""}`,
    { signal }
  );
  if (!res.ok) throw new Error("Failed to fetch resale listings");

  const payload = await res.json();
  const rawList: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.listings)
      ? payload.listings
      : [];

  return {
    listings: rawList.map(normalizeResaleListing),
    has_more: Boolean(payload?.has_more ?? false),
    next_cursor: payload?.next_cursor ?? null,
  };
}

/** One historical ask-price data point across an invoice's secondary market listings (issue #413). */
export interface InvoicePriceHistoryPoint {
  date: string;
  price: number;
  quantity: number;
}

export interface InvoicePriceHistory {
  invoice_id: string;
  /** Ask price of the invoice's current active listing, or null if it isn't currently listed. */
  current_ask_price: number | null;
  history: InvoicePriceHistoryPoint[];
}

function normalizeInvoicePriceHistoryPoint(raw: any): InvoicePriceHistoryPoint {
  return {
    date: String(raw.date ?? raw.timestamp ?? raw.listed_at ?? raw.created_at ?? ""),
    price: Number(raw.price ?? raw.ask_price ?? raw.askPrice ?? 0),
    quantity: Number(raw.quantity ?? raw.qty ?? 0),
  };
}

function normalizeInvoicePriceHistory(raw: any, invoiceId: string): InvoicePriceHistory {
  const list = Array.isArray(raw) ? raw : raw?.history ?? raw?.points ?? [];
  const rawCurrent = raw?.current_ask_price ?? raw?.currentAskPrice;
  return {
    invoice_id: String(raw?.invoice_id ?? raw?.invoiceId ?? invoiceId),
    current_ask_price:
      rawCurrent !== undefined && rawCurrent !== null ? Number(rawCurrent) : null,
    history: (Array.isArray(list) ? list : []).map(normalizeInvoicePriceHistoryPoint),
  };
}

export type PriceHistoryRangeParam = "7d" | "30d" | "all";

/**
 * Historical ask prices for an invoice's secondary market listings, for the
 * price history chart on the listing detail page (issue #413). `range` is
 * passed through to the backend so a long-lived invoice's "all time" history
 * doesn't need to be fetched (and normalized) just to show the last 7 days.
 */
export async function fetchInvoicePriceHistory(
  invoiceId: string,
  range: PriceHistoryRangeParam = "all",
  signal?: AbortSignal
): Promise<InvoicePriceHistory> {
  const res = await fetch(
    `${API_BASE}/marketplace/invoices/${invoiceId}/price-history?range=${range}`,
    { signal }
  );
  if (!res.ok) throw new Error("Failed to fetch invoice price history");

  const payload = await res.json();
  return normalizeInvoicePriceHistory(payload, invoiceId);
}

export interface BuyFractionInput {
  listingId: string;
  /** Number of fractions to purchase. */
  quantity: number;
}

export interface BuyFractionResult {
  success: boolean;
  transaction_hash?: string;
  /** Remaining quantity reported by the contract after the transfer. */
  remaining_quantity?: number;
}

/**
 * Submits the Soroban `transfer_fraction` contract call that moves the
 * requested fractions from the seller to the buyer.
 */
export async function buyFraction(
  input: BuyFractionInput,
  token?: string
): Promise<BuyFractionResult> {
  const res = await fetch(`${API_BASE}/marketplace/listings/${input.listingId}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ quantity: input.quantity }),
  });
  if (!res.ok) {
    const message = await readConflictErrorMessage(res, "Failed to buy fraction");
    throw new Error(message);
  }
  return res.json();
}

// ─── Admin invoice review queue (issue #384) ─────────────────────────────

export interface PendingInvoice {
  id: string;
  title: string;
  seller: string;
  face_value: number;
  submission_date: string;
  document_url?: string;
}

export interface PendingInvoicesResponse {
  invoices: PendingInvoice[];
}

function normalizePendingInvoice(raw: any): PendingInvoice {
  return {
    id: raw.id ?? raw.invoiceId ?? raw.invoice_id ?? "",
    title: raw.title ?? raw.invoice_title ?? "",
    seller: raw.seller ?? raw.sellerWallet ?? raw.seller_wallet ?? "",
    face_value:
      Number(raw.face_value ?? raw.faceValue ?? raw.amount ?? 0),
    submission_date:
      raw.submission_date ?? raw.submissionDate ?? raw.submitted_at ?? raw.created_at ?? "",
    document_url: raw.document_url ?? raw.documentUrl ?? undefined,
  };
}

export async function fetchPendingInvoices(
  token?: string
): Promise<PendingInvoice[]> {
  const res = await fetch(`${API_BASE}/admin/invoices?status=pending`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch pending invoices");
  const payload = await res.json();
  const list: any[] = Array.isArray(payload)
    ? payload
    : payload.invoices ?? [];
  return list.map(normalizePendingInvoice);
}

export interface ReviewedInvoice extends PendingInvoice {
  review_status: "approved" | "rejected";
  reviewed_at: string;
  rejection_reason?: string;
}

export interface ReviewedInvoicesResponse {
  invoices: ReviewedInvoice[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeReviewedInvoice(raw: any): ReviewedInvoice {
  const base = normalizePendingInvoice(raw);
  return {
    ...base,
    review_status: raw.review_status ?? raw.reviewStatus ?? raw.status ?? "approved",
    reviewed_at: raw.reviewed_at ?? raw.reviewedAt ?? raw.updated_at ?? "",
    rejection_reason: raw.rejection_reason ?? raw.rejectionReason ?? undefined,
  };
}

export async function fetchReviewedInvoices(
  status: "approved" | "rejected",
  cursor?: string,
  token?: string
): Promise<ReviewedInvoicesResponse> {
  const params = new URLSearchParams({ status });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/admin/invoices?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch reviewed invoices");
  const payload = await res.json();
  const list: any[] = Array.isArray(payload)
    ? payload
    : payload.invoices ?? [];
  return {
    invoices: list.map(normalizeReviewedInvoice),
    has_more: payload.has_more ?? false,
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function approveInvoice(
  invoiceId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Failed to approve invoice");
  return res.json();
}

export async function rejectInvoice(
  invoiceId: string,
  reason: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject invoice");
  return res.json();
}

// ─── Issuer earnings dashboard (issue #387) ──────────────────────────────

export interface IssuerEarningsSummary {
  gross_proceeds: number;
  platform_fee: number;
  net_payout: number;
}

export type IssuerPayoutStatus = "pending" | "paid" | "processing";

export interface IssuerInvoiceEarning {
  invoice_id: string;
  invoice_title: string;
  face_value: number;
  funded_date: string;
  gross_proceeds: number;
  platform_fee: number;
  net_payout: number;
  payout_status: IssuerPayoutStatus;
  transaction_hash?: string;
}

export interface IssuerEarningsResponse {
  summary: IssuerEarningsSummary;
  invoices: IssuerInvoiceEarning[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeIssuerEarningsSummary(raw: any): IssuerEarningsSummary {
  return {
    gross_proceeds: Number(raw.gross_proceeds ?? raw.grossProceeds ?? 0),
    platform_fee: Number(raw.platform_fee ?? raw.platformFee ?? 0),
    net_payout: Number(raw.net_payout ?? raw.netPayout ?? 0),
  };
}

function normalizeIssuerInvoiceEarning(raw: any): IssuerInvoiceEarning {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? raw.id ?? "",
    invoice_title: raw.invoice_title ?? raw.invoiceTitle ?? raw.title ?? "",
    face_value: Number(raw.face_value ?? raw.faceValue ?? raw.amount ?? 0),
    funded_date: raw.funded_date ?? raw.fundedDate ?? raw.funded_at ?? "",
    gross_proceeds: Number(raw.gross_proceeds ?? raw.grossProceeds ?? 0),
    platform_fee: Number(raw.platform_fee ?? raw.platformFee ?? 0),
    net_payout: Number(raw.net_payout ?? raw.netPayout ?? 0),
    payout_status: raw.payout_status ?? raw.payoutStatus ?? "pending",
    transaction_hash: raw.transaction_hash ?? raw.transactionHash ?? undefined,
  };
}

export async function fetchIssuerEarnings(
  cursor?: string,
  token?: string
): Promise<IssuerEarningsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/issuer/earnings?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch issuer earnings");
  const payload = await res.json();
  return {
    summary: normalizeIssuerEarningsSummary(payload.summary ?? payload),
    invoices: (payload.invoices ?? []).map(normalizeIssuerInvoiceEarning),
    has_more: payload.has_more ?? false,
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function withdrawIssuerEarnings(
  invoiceId: string,
  token?: string
): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(`${API_BASE}/issuer/earnings/${invoiceId}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Failed to submit withdrawal");
  return res.json();
}

// ─── Invoice funding progress polling (issue #388) ───────────────────────

export interface InvoiceFundingProgress {
  invoice_id: string;
  raised: number;
  target: number;
  investor_count: number;
  is_fully_funded: boolean;
}

function normalizeInvoiceFundingProgress(raw: any, invoiceId: string): InvoiceFundingProgress {
  const target = Number(raw.target ?? raw.amount ?? raw.face_value ?? 0);
  const raised = Number(raw.raised ?? raw.funded ?? raw.raised_amount ?? 0);
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    raised,
    target,
    investor_count: Number(raw.investor_count ?? raw.investorCount ?? 0),
    is_fully_funded:
      typeof raw.is_fully_funded === "boolean"
        ? raw.is_fully_funded
        : target > 0 && raised >= target,
  };
}

export async function fetchInvoiceFundingProgress(
  invoiceId: string
): Promise<InvoiceFundingProgress> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/funding-progress`
  );
  if (!res.ok) throw new Error("Failed to fetch funding progress");
  return normalizeInvoiceFundingProgress(await res.json(), invoiceId);
}

// ─── Investor accreditation gating (issue #389) ──────────────────────────

export type AccreditationTier = "unaccredited" | "accredited" | "qualified";

export interface AccreditationStatus {
  wallet: string;
  tier: AccreditationTier;
  /** Minimum face value (XLM) that requires accreditation. */
  high_value_threshold: number;
}

const ACCREDITATION_TIERS: AccreditationTier[] = [
  "unaccredited",
  "accredited",
  "qualified",
];

function normalizeAccreditationTier(raw: any): AccreditationTier {
  const v = String(raw ?? "").toLowerCase();
  if ((ACCREDITATION_TIERS as string[]).includes(v)) return v as AccreditationTier;
  if (v === "none" || v === "basic") return "unaccredited";
  if (v === "standard" || v === "verified") return "accredited";
  if (v === "institutional" || v === "sophisticated") return "qualified";
  return "unaccredited";
}

function normalizeAccreditationStatus(raw: any, wallet: string): AccreditationStatus {
  return {
    wallet: raw.wallet ?? raw.address ?? wallet,
    tier: normalizeAccreditationTier(raw.tier ?? raw.accreditation_tier ?? raw.accreditationTier),
    high_value_threshold: Number(
      raw.high_value_threshold ?? raw.highValueThreshold ?? raw.threshold ?? 100_000
    ),
  };
}

export async function fetchAccreditationStatus(
  walletAddress: string,
  token?: string
): Promise<AccreditationStatus> {
  const res = await fetch(
    `${API_BASE}/investors/${encodeURIComponent(walletAddress)}/accreditation`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch accreditation status");
  return normalizeAccreditationStatus(await res.json(), walletAddress);
}

/** True if the investor's accreditation tier allows investing in a given invoice face value. */
export function isAccreditedForInvoice(
  tier: AccreditationTier,
  faceValue: number,
  threshold: number
): boolean {
  if (faceValue < threshold) return true;
  return tier === "accredited" || tier === "qualified";
}

// ─── Invoice holder dividend claim page (issue #350) ─────────────────────

export interface DividendCycle {
  cycle: string;
  cycle_id?: string;
  amount: number;
  distribution_date: string;
  claimable: boolean;
  claimed?: boolean;
  transaction_hash?: string | null;
}

export interface DividendClaimRecord {
  cycle: string;
  amount: number;
  claimed_at: string;
  transaction_hash: string;
}

export interface InvestorDividendsResponse {
  total_earned: number;
  total_pending: number;
  claimable: DividendCycle[];
  history: DividendClaimRecord[];
}

function normalizeDividendCycle(raw: any): DividendCycle {
  const cycle = String(raw.cycle ?? raw.cycle_id ?? raw.cycleId ?? raw.id ?? "");
  const amount = Number(raw.amount ?? raw.claimable_amount ?? 0);
  const distribution_date = String(
    raw.distribution_date ?? raw.distributionDate ?? raw.date ?? raw.created_at ?? ""
  );
  const claimed = Boolean(raw.claimed ?? false);
  return {
    cycle,
    cycle_id: raw.cycle_id ?? raw.cycleId ?? cycle,
    amount,
    distribution_date,
    claimable: typeof raw.claimable === "boolean" ? raw.claimable : !claimed,
    claimed,
    transaction_hash: raw.transaction_hash ?? raw.transactionHash ?? null,
  };
}

function normalizeDividendClaimRecord(raw: any): DividendClaimRecord {
  return {
    cycle: String(raw.cycle ?? raw.cycle_id ?? ""),
    amount: Number(raw.amount ?? 0),
    claimed_at: String(raw.claimed_at ?? raw.claimedAt ?? raw.date ?? ""),
    transaction_hash: String(raw.transaction_hash ?? raw.transactionHash ?? raw.tx_hash ?? ""),
  };
}

function normalizeInvestorDividends(raw: any): InvestorDividendsResponse {
  const claimableRaw: any[] = Array.isArray(raw.claimable)
    ? raw.claimable
    : Array.isArray(raw.claimsByCycle)
      ? raw.claimsByCycle
      : Array.isArray(raw.cycles)
        ? raw.cycles
        : [];
  const historyRaw: any[] = Array.isArray(raw.history)
    ? raw.history
    : Array.isArray(raw.claimed)
      ? raw.claimed
      : [];
  const claimable = claimableRaw.map(normalizeDividendCycle);
  const history = historyRaw.map(normalizeDividendClaimRecord);
  const total_pending = Number(
    raw.total_pending ?? raw.totalPending ?? raw.pendingClaims ?? 0
  );
  const total_earned = Number(
    raw.total_earned ?? raw.totalEarned ?? raw.totalEarnedXlm ?? 0
  );
  // Aggregate fallback when backend only sends cycles.
  const pendingFallback = claimable
    .filter((c) => c.claimable && !c.claimed)
    .reduce((sum, c) => sum + c.amount, 0);
  const earnedFallback =
    pendingFallback + history.reduce((sum, h) => sum + h.amount, 0);
  return {
    total_earned: total_earned || earnedFallback,
    total_pending: raw.total_pending !== undefined ? total_pending : pendingFallback,
    claimable,
    history,
  };
}

export async function fetchInvestorDividends(): Promise<InvestorDividendsResponse> {
  const res = await fetch(`${API_BASE}/investor/dividends`);
  if (!res.ok) throw new Error("Failed to fetch dividends");
  return normalizeInvestorDividends(await res.json());
}

export async function claimDividendCycle(
  cycleId: string
): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(
    `${API_BASE}/investor/dividends/${encodeURIComponent(cycleId)}/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) throw new Error("Failed to claim dividend");
  return res.json();
}

export async function claimAllDividends(): Promise<InvestorDividendsResponse> {
  const res = await fetch(`${API_BASE}/investor/claim-dividends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to claim dividends");
  const payload = await res.json();
  // Backend may return the refreshed summary or just success.
  if (payload && (payload.claimable || payload.claimsByCycle || payload.total_earned !== undefined)) {
    return normalizeInvestorDividends(payload);
  }
  return fetchInvestorDividends();
}

// ─── Invoice rating widget (issue #348) ──────────────────────────────────

export interface InvoiceRatingSummary {
  invoice_id: string;
  average_rating: number;
  rating_count: number;
  user_rating?: number | null;
}

function normalizeInvoiceRating(raw: any, invoiceId: string): InvoiceRatingSummary {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    average_rating: Number(raw.average_rating ?? raw.averageRating ?? raw.average ?? 0),
    rating_count: Number(raw.rating_count ?? raw.ratingCount ?? raw.count ?? 0),
    user_rating:
      raw.user_rating !== undefined && raw.user_rating !== null
        ? Number(raw.user_rating)
        : (raw.userRating !== undefined && raw.userRating !== null
          ? Number(raw.userRating)
          : null),
  };
}

export async function fetchInvoiceRating(
  invoiceId: string
): Promise<InvoiceRatingSummary> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/rating`
  );
  if (!res.ok) throw new Error("Failed to fetch invoice rating");
  return normalizeInvoiceRating(await res.json(), invoiceId);
}

export async function submitInvoiceRating(
  invoiceId: string,
  rating: number,
  walletAddress?: string,
  token?: string
): Promise<InvoiceRatingSummary> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/rating`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ rating, wallet: walletAddress }),
    }
  );
  if (!res.ok) throw new Error("Failed to submit rating");
  return normalizeInvoiceRating(await res.json(), invoiceId);
}
