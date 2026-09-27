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
import { DocumentUpload } from "@/components/invoices/DocumentUpload";
import { FaceValueInput } from "@/components/invoices/FaceValueInput";
import { uploadDocumentToIpfs, publishInvoice } from "@/lib/api";
import {
  MIN_INVOICE_FACE_VALUE,
  validateFaceValue,
} from "@/lib/validation/face-value";
import { validateDeadline } from "@/lib/validation/deadline";
import { useAuth } from "@/hooks/useAuth";

const detailsSchema = z.object({
  title: z.string().min(1, "Invoice title is required"),
  description: z.string().min(1, "Description is required"),
  faceValue: z
    .string()
    .min(1, "Face value is required")
    .refine((v) => Number(v) > 0, "Face value must be greater than 0"),
  fundingDeadline: z
    .string()
    .min(1, "Funding deadline is required")
    .superRefine((v, ctx) => {
      const error = validateDeadline(v);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      }
    }),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Invoice Details",
  2: "Document Upload",
  3: "Confirmation",
};

export function PublishInvoiceForm() {
  const router = useRouter();
  const { jwt } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentCid, setDocumentCid] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedInvoiceId, setPublishedInvoiceId] = useState<string | null>(
    null,
  );

  const {
    register,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      title: "",
      description: "",
      faceValue: "",
      fundingDeadline: "",
    },
  });

  const [isFaceValueValid, setIsFaceValueValid] = useState(false);

  const handleNextFromDetails = useCallback(async () => {
    const valid = await trigger();
    if (valid) setStep(2);
  }, [trigger]);

  const handleFaceValueChange = useCallback(
    (amount: number | null) => {
      setIsFaceValueValid(amount !== null);
      if (amount !== null) {
        setValue("faceValue", String(amount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        setValue("faceValue", "", { shouldValidate: true, shouldDirty: true });
      }
    },
    [setValue]
  );

  const handleUpload = useCallback((file: File) => {
    setDocumentFile(file);
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
      })
      .catch(() => {
        clearInterval(interval);
        setUploadProgress(0);
        toast.error("Document upload failed. Please try again.");
      })
      .finally(() => {
        setIsUploading(false);
      });
  }, [jwt]);

  const handlePublish = useCallback(async () => {
    if (!documentCid) return;

    setIsPublishing(true);
    try {
      const values = getValues();
      const result = await publishInvoice({
        title: values.title,
        description: values.description,
        faceValue: Number(values.faceValue),
        fundingDeadline: values.fundingDeadline,
        documentCid,
      }, jwt ?? undefined);
      router.push(`/dashboard/seller/publish/success?invoiceId=${result.id}`);
    } catch {
      toast.error("Failed to publish invoice. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }, [documentCid, getValues, jwt, router]);

  if (publishedInvoiceId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <h2 className="text-xl font-bold">Invoice Published</h2>
          <p className="text-sm text-muted-foreground">
            Your invoice has been submitted for funding.
          </p>
          <p className="font-mono text-sm">
            Invoice ID:{" "}
            <span className="font-semibold">{publishedInvoiceId}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  const values = getValues();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {([1, 2, 3] as Step[]).map((s) => (
            <span
              key={s}
              className={s === step ? "font-semibold text-foreground" : ""}
            >
              {s > 1 && <span className="mx-2">›</span>}
              {s}. {STEP_LABELS[s]}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-title">Invoice Title</Label>
              <Input id="invoice-title" {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-description">Description</Label>
              <Input id="invoice-description" {...register("description")} />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <FaceValueInput
                defaultValue={watch("faceValue")}
                onValidAmountChange={handleFaceValueChange}
              />
              {errors.faceValue && (
                <p className="text-sm text-destructive">
                  {errors.faceValue.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-deadline">Funding Deadline</Label>
              <Input
                id="invoice-deadline"
                type="date"
                {...register("fundingDeadline")}
              />
              {errors.fundingDeadline && (
                <p className="text-sm text-destructive">
                  {errors.fundingDeadline.message}
                </p>
              )}
            </div>

            <Button onClick={handleNextFromDetails} disabled={!isFaceValueValid}>
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <DocumentUpload onUpload={handleUpload} />

            {documentFile && (isUploading || uploadProgress > 0) && (
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {documentCid
                    ? "Upload complete"
                    : `Uploading... ${uploadProgress}%`}
                </p>
              </div>
            )}

            {documentCid && (
              <p className="text-sm">
                CID: <span className="font-mono">{documentCid}</span>
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!documentCid}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Invoice Details</h3>
              <Button variant="link" size="sm" onClick={() => setStep(1)}>
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Title</span>
              <span>{values.title}</span>
              <span className="text-muted-foreground">Description</span>
              <span>{values.description}</span>
              <span className="text-muted-foreground">Face Value</span>
              <span>{Number(values.faceValue).toLocaleString()} XLM</span>
              <span className="text-muted-foreground">Funding Deadline</span>
              <span>{values.fundingDeadline}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Document</h3>
              <Button variant="link" size="sm" onClick={() => setStep(2)}>
                Edit
              </Button>
            </div>
            <p className="text-sm font-mono break-all">{documentCid}</p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
