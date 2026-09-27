"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUpload } from "@/components/invoices/DocumentUpload";
import { fetchInvoiceDetail, updateInvoice, uploadDocumentToIpfs, type InvoiceDetail } from "@/lib/api";

const editSchema = z.object({
  title: z.string().min(1, "Invoice title is required"),
  description: z.string().min(1, "Description is required"),
  faceValue: z
    .string()
    .min(1, "Face value is required")
    .refine((v) => Number(v) > 0, "Face value must be greater than 0"),
  fundingDeadline: z.string().min(1, "Funding deadline is required"),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditInvoiceFormProps {
  invoiceId: string;
}

export function EditInvoiceForm({ invoiceId }: EditInvoiceFormProps) {
  const router = useRouter();
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);
  const [documentCid, setDocumentCid] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const { data: invoice, isLoading, isError } = useQuery<InvoiceDetail>({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: () => fetchInvoiceDetail(invoiceId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: "", description: "", faceValue: "", fundingDeadline: "" },
  });

  useEffect(() => {
    if (invoice) {
      const initialTitle = invoice.title || "";
      const initialDesc = invoice.description || "";
      const initialFaceValue = String(invoice.amount ?? (invoice as any).face_value ?? (invoice as any).faceValue ?? "");
      const initialDeadline = invoice.due_date ?? (invoice as any).funding_deadline ?? (invoice as any).fundingDeadline ?? "";
      const initialCid = (invoice as any).document_cid ?? (invoice as any).documentCid ?? invoice.document_url ?? "";

      reset({
        title: initialTitle,
        description: initialDesc,
        faceValue: initialFaceValue,
        fundingDeadline: initialDeadline,
      });

      setDocumentCid(initialCid);
    }
  }, [invoice, reset]);

  const handleUpload = useCallback((file: File) => {
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

    uploadDocumentToIpfs(file)
      .then((result) => {
        clearInterval(interval);
        setUploadProgress(100);
        setDocumentCid(result.cid);
        setShowReplaceUpload(false);
        toast.success("Document replaced successfully");
      })
      .catch(() => {
        clearInterval(interval);
        setUploadProgress(0);
        toast.error("Document upload failed. Please try again.");
      })
      .finally(() => {
        setIsUploading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <Card data-testid="edit-invoice-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !invoice) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load invoice details.
        </CardContent>
      </Card>
    );
  }

  // Check if invoice is not in draft state
  const status = invoice.status?.toLowerCase();
  if (status !== "draft") {
    return (
      <Card data-testid="cannot-edit-card">
        <CardContent className="py-12 text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">This invoice cannot be edited</h2>
          <p className="text-sm text-muted-foreground">
            Only invoices in draft status can be modified.
          </p>
          <Button variant="outline" onClick={() => router.push("/seller")}>
            Return to Seller Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (values: EditFormData) => {
    setIsSaving(true);
    try {
      const initialTitle = invoice.title || "";
      const initialDesc = invoice.description || "";
      const initialFaceValue = String(invoice.amount ?? (invoice as any).face_value ?? (invoice as any).faceValue ?? "");
      const initialDeadline = invoice.due_date ?? (invoice as any).funding_deadline ?? (invoice as any).fundingDeadline ?? "";
      const initialCid = (invoice as any).document_cid ?? (invoice as any).documentCid ?? invoice.document_url ?? "";

      const changes: Record<string, any> = {};

      if (values.title !== initialTitle) changes.title = values.title;
      if (values.description !== initialDesc) changes.description = values.description;
      if (Number(values.faceValue) !== Number(initialFaceValue)) changes.faceValue = Number(values.faceValue);
      if (values.fundingDeadline !== initialDeadline) changes.fundingDeadline = values.fundingDeadline;
      if (documentCid !== initialCid) changes.documentCid = documentCid;

      // Send PATCH request with changes (or all form values if no specific diff is required)
      const payload = Object.keys(changes).length > 0 ? changes : {
        title: values.title,
        description: values.description,
        faceValue: Number(values.faceValue),
        fundingDeadline: values.fundingDeadline,
        documentCid,
      };

      await updateInvoice(invoiceId, payload);
      toast.success("Invoice updated successfully");
      router.push("/seller");
    } catch {
      toast.error("Failed to update invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-testid="edit-invoice-form">
      <CardHeader>
        <CardTitle>Edit Draft Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Invoice Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="faceValue">Face Value (XLM)</Label>
            <Input id="faceValue" inputMode="decimal" {...register("faceValue")} />
            {errors.faceValue && (
              <p className="text-sm text-destructive">{errors.faceValue.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundingDeadline">Funding Deadline</Label>
            <Input id="fundingDeadline" type="date" {...register("fundingDeadline")} />
            {errors.fundingDeadline && (
              <p className="text-sm text-destructive">{errors.fundingDeadline.message}</p>
            )}
          </div>

          {/* Document Section */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
            <Label className="text-base font-semibold">Supporting Document</Label>

            {documentCid ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Existing Document CID: <span className="font-mono font-medium break-all">{documentCid}</span>
                </p>
                {!showReplaceUpload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReplaceUpload(true)}
                  >
                    Replace document
                  </Button>
                )}
              </div>
            ) : null}

            {(showReplaceUpload || !documentCid) && (
              <div className="space-y-3 pt-2">
                <DocumentUpload onUpload={handleUpload} />

                {isUploading && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Uploading document... {uploadProgress}%</p>
                  </div>
                )}

                {showReplaceUpload && documentCid && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplaceUpload(false)}
                  >
                    Cancel replace
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/seller")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
