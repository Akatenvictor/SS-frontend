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

export type ActivityEventType =
  | "investment"
  | "secondary_buy"
  | "secondary_sell"
  | "transfer"
  | "settlement"
  | "kyc_submitted"
  | "kyc_approved"
  | "kyc_rejected";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  amount: number | null;
  currency: string;
  timestamp: string;
  related_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PortfolioSummary {
  total_invested: number;
  total_yield_earned: number;
  active_holdings_count: number;
}

export interface UpcomingMaturity {
  invoice_id: string;
  title: string;
  amount: number;
  due_date: string;
  days_remaining: number;
}

export interface WatchlistItem {
  invoice_id: string;
  added_at: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
}

export interface BusinessDetails {
  company_name: string;
  registration_number: string;
  country: string;
  address: string;
}

export interface DirectorDetails {
  name: string;
  id_document_url: string;
  date_of_birth: string;
}

export interface RegulatoryDocuments {
  certificate_of_incorporation_url: string;
  tax_id_url: string;
  bank_statement_url: string;
}

export interface KycSubmission {
  business_details: BusinessDetails;
  director_details: DirectorDetails;
  regulatory_documents: RegulatoryDocuments;
}

export interface KycStatus {
  status: "pending" | "approved" | "rejected" | "not_started";
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

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
  if (!res.ok) throw new Error("Failed to fetch invoice detail");
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

export async function fetchActivity(
  cursor?: string,
  type?: ActivityEventType,
  startDate?: string,
  endDate?: string
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (type) params.set("type", type);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const res = await fetch(`${API_BASE}/activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio/summary`);
  if (!res.ok) throw new Error("Failed to fetch portfolio summary");
  return res.json();
}

export async function fetchRecentActivity(limit = 5): Promise<ActivityEvent[]> {
  const res = await fetch(`${API_BASE}/portfolio/recent-activity?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch recent activity");
  return res.json();
}

export async function fetchUpcomingMaturities(limit = 3): Promise<UpcomingMaturity[]> {
  const res = await fetch(`${API_BASE}/portfolio/upcoming-maturities?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch upcoming maturities");
  return res.json();
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch(`${API_BASE}/watchlist`);
  if (!res.ok) throw new Error("Failed to fetch watchlist");
  return res.json();
}

export async function addToWatchlist(invoiceId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
  if (!res.ok) throw new Error("Failed to add to watchlist");
  return res.json();
}

export async function removeFromWatchlist(invoiceId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/watchlist/${invoiceId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove from watchlist");
  return res.json();
}

export async function submitKyc(data: KycSubmission): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kyc/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit KYC");
  return res.json();
}

export async function fetchKycStatus(): Promise<KycStatus> {
  const res = await fetch(`${API_BASE}/kyc/status`);
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return res.json();
}

export async function uploadDocument(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}
