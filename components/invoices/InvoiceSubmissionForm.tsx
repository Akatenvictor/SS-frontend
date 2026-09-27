"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { DocumentUpload } from "@/components/invoices/DocumentUpload";
import { uploadDocumentToIpfs, publishInvoice } from "@/lib/api";
import { validateDeadline } from "@/lib/validation/deadline";
import { useAuth } from "@/hooks/useAuth";

// ─── Validation schemas ───────────────────────────────────────────────────────

const invoiceDetailsSchema = z.object({
  title: z.string().min(1, "Invoice title is required"),
  debtorName: z.string().min(1, "Debtor name is required"),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .superRefine((v, ctx) => {
      const error = validateDeadline(v);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
});

const financialTermsSchema = z.object({
  faceValue: z
    .string()
    .min(1, "Face value is required")
    .refine((v) => Number(v) > 0, "Must be greater than 0"),
  yieldPercent: z
    .string()
    .min(1, "Yield is required")
    .refine(
      (v) => Number(v) > 0 && Number(v) <= 100,
      "Yield must be between 0 and 100"
    ),
  minInvestment: z
    .string()
    .min(1, "Minimum investment is required")
    .refine((v) => Number(v) > 0, "Must be greater than 0"),
  maturityDate: z.string().min(1, "Maturity date is required"),
});

type InvoiceDetailsData = z.infer<typeof invoiceDetailsSchema>;
type FinancialTermsData = z.infer<typeof financialTermsSchema>;

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Invoice Details",
  2: "Financial Terms",
  3: "Document Upload",
  4: "Review & Submit",
};

// ─── Step progress indicator ──────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <span
          key={s}
          className={s === current ? "font-semibold text-foreground" : ""}
        >
          {s > 1 && <span className="mx-2">›</span>}
          {s}. {STEP_LABELS[s]}
        </span>
      ))}
    </div>
  );
}

// ─── Review row helper ────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value || "—"}</span>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InvoiceSubmissionForm() {
  const router = useRouter();
  const { jwt } = useAuth();
  const [step, setStep] = useState<Step>(1);

  // Document upload state
  const [documentCid, setDocumentCid] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 1: Invoice details ───────────────────────────────────────────────
  const detailsForm = useForm<InvoiceDetailsData>({
    resolver: zodResolver(invoiceDetailsSchema),
    defaultValues: {
      title: "",
      debtorName: "",
      dueDate: "",
      invoiceNumber: "",
    },
  });

  // ── Step 2: Financial terms ───────────────────────────────────────────────
  const financialForm = useForm<FinancialTermsData>({
    resolver: zodResolver(financialTermsSchema),
    defaultValues: {
      faceValue: "",
      yieldPercent: "",
      minInvestment: "",
      maturityDate: "",
    },
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNextFromStep1 = useCallback(async () => {
    const valid = await detailsForm.trigger();
    if (valid) setStep(2);
  }, [detailsForm]);

  const handleNextFromStep2 = useCallback(async () => {
    const valid = await financialForm.trigger();
    if (valid) setStep(3);
  }, [financialForm]);

  const handleNextFromStep3 = useCallback(() => {
    if (!documentCid) {
      toast.error("Please upload and wait for the document to finish uploading");
      return;
    }
    setStep(4);
  }, [documentCid]);

  // ── Document upload ───────────────────────────────────────────────────────

  const handleDocumentUpload = useCallback(
    (file: File) => {
      setDocumentCid(null);
      setIsUploading(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      uploadDocumentToIpfs(file, jwt ?? undefined)
        .then((result) => {
          clearInterval(interval);
          setUploadProgress(100);
          setDocumentCid(result.cid);
          toast.success("Document uploaded to IPFS");
        })
        .catch(() => {
          clearInterval(interval);
          setUploadProgress(0);
          toast.error("Document upload failed. Please try again.");
        })
        .finally(() => {
          setIsUploading(false);
        });
    },
    [jwt]
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!documentCid) return;

    setIsSubmitting(true);
    try {
      const details = detailsForm.getValues();
      const financial = financialForm.getValues();

      const result = await publishInvoice(
        {
          title: details.title,
          description: `Debtor: ${details.debtorName} | Invoice #${details.invoiceNumber}`,
          faceValue: Number(financial.faceValue),
          fundingDeadline: details.dueDate,
          documentCid,
        },
        jwt ?? undefined
      );

      toast.success("Invoice submitted successfully");
      router.push(`/seller?invoiceId=${result.id}`);
    } catch {
      toast.error("Failed to submit invoice. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [detailsForm, financialForm, documentCid, jwt, router]);

  // ── Values for review ─────────────────────────────────────────────────────

  const detailsValues = detailsForm.getValues();
  const financialValues = financialForm.getValues();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <StepIndicator current={step} />
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Step 1: Invoice Details ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-title">Invoice Title</Label>
              <Input
                id="inv-title"
                placeholder="e.g. Q3 Supply Invoice"
                {...detailsForm.register("title")}
              />
              {detailsForm.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {detailsForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-debtor">Debtor Name</Label>
              <Input
                id="inv-debtor"
                placeholder="Company or individual owed"
                {...detailsForm.register("debtorName")}
              />
              {detailsForm.formState.errors.debtorName && (
                <p className="text-sm text-destructive">
                  {detailsForm.formState.errors.debtorName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-due-date">Due Date</Label>
              <Input
                id="inv-due-date"
                type="date"
                {...detailsForm.register("dueDate")}
              />
              {detailsForm.formState.errors.dueDate && (
                <p className="text-sm text-destructive">
                  {detailsForm.formState.errors.dueDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-number">Invoice Number</Label>
              <Input
                id="inv-number"
                placeholder="e.g. INV-2026-0042"
                {...detailsForm.register("invoiceNumber")}
              />
              {detailsForm.formState.errors.invoiceNumber && (
                <p className="text-sm text-destructive">
                  {detailsForm.formState.errors.invoiceNumber.message}
                </p>
              )}
            </div>

            <Button onClick={handleNextFromStep1}>Next</Button>
          </div>
        )}

        {/* ── Step 2: Financial Terms ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-face-value">Face Value (XLM)</Label>
              <Input
                id="inv-face-value"
                type="number"
                min={1}
                placeholder="e.g. 50000"
                {...financialForm.register("faceValue")}
              />
              {financialForm.formState.errors.faceValue && (
                <p className="text-sm text-destructive">
                  {financialForm.formState.errors.faceValue.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-yield">Yield (%)</Label>
              <Input
                id="inv-yield"
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                placeholder="e.g. 8.5"
                {...financialForm.register("yieldPercent")}
              />
              {financialForm.formState.errors.yieldPercent && (
                <p className="text-sm text-destructive">
                  {financialForm.formState.errors.yieldPercent.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-min-invest">Minimum Investment (XLM)</Label>
              <Input
                id="inv-min-invest"
                type="number"
                min={1}
                placeholder="e.g. 500"
                {...financialForm.register("minInvestment")}
              />
              {financialForm.formState.errors.minInvestment && (
                <p className="text-sm text-destructive">
                  {financialForm.formState.errors.minInvestment.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-maturity">Maturity Date</Label>
              <Input
                id="inv-maturity"
                type="date"
                {...financialForm.register("maturityDate")}
              />
              {financialForm.formState.errors.maturityDate && (
                <p className="text-sm text-destructive">
                  {financialForm.formState.errors.maturityDate.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleNextFromStep2}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Document Upload ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload the invoice document (PDF). It will be stored on IPFS.
            </p>

            <DocumentUpload onUpload={handleDocumentUpload} />

            {(isUploading || uploadProgress > 0) && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {documentCid
                    ? "Upload complete ✓"
                    : `Uploading to IPFS… ${uploadProgress}%`}
                </p>
              </div>
            )}

            {documentCid && (
              <p className="text-sm">
                CID:{" "}
                <span className="font-mono break-all">{documentCid}</span>
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleNextFromStep3}
                disabled={isUploading || !documentCid}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ──────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Invoice Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Invoice Details</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(1)}
                  aria-label="Edit invoice details"
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <ReviewRow label="Title" value={detailsValues.title} />
                <ReviewRow label="Debtor Name" value={detailsValues.debtorName} />
                <ReviewRow label="Invoice Number" value={detailsValues.invoiceNumber} />
                <ReviewRow label="Due Date" value={detailsValues.dueDate} />
              </div>
            </div>

            <Separator />

            {/* Financial Terms */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Financial Terms</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(2)}
                  aria-label="Edit financial terms"
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <ReviewRow
                  label="Face Value"
                  value={`${Number(financialValues.faceValue).toLocaleString()} XLM`}
                />
                <ReviewRow
                  label="Yield"
                  value={`${financialValues.yieldPercent}%`}
                />
                <ReviewRow
                  label="Min Investment"
                  value={`${Number(financialValues.minInvestment).toLocaleString()} XLM`}
                />
                <ReviewRow
                  label="Maturity Date"
                  value={financialValues.maturityDate}
                />
              </div>
            </div>

            <Separator />

            {/* Document */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Document</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(3)}
                  aria-label="Edit document"
                >
                  Edit
                </Button>
              </div>
              <p className="text-sm font-mono break-all text-muted-foreground">
                {documentCid}
              </p>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit Invoice"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
