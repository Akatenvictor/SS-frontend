"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitKyc } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const NATIONALITIES = [
  "American",
  "Australian",
  "Brazilian",
  "British",
  "Canadian",
  "Chinese",
  "French",
  "German",
  "Indian",
  "Japanese",
  "Nigerian",
  "Singaporean",
  "South African",
  "Other",
];

const ID_TYPES = ["Passport", "Driver's License", "National ID Card"];

const ADDRESS_DOC_TYPES = [
  "Utility Bill",
  "Bank Statement",
  "Government Letter",
  "Lease Agreement",
];

// ─── Validation schemas ───────────────────────────────────────────────────────

const personalSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  address: z.string().min(1, "Address is required"),
});

const identitySchema = z.object({
  idType: z.string().min(1, "Document type is required"),
});

const addressDocSchema = z.object({
  addressDocType: z.string().min(1, "Document type is required"),
});

type PersonalData = z.infer<typeof personalSchema>;
type IdentityData = z.infer<typeof identitySchema>;
type AddressDocData = z.infer<typeof addressDocSchema>;

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Personal Details",
  2: "Identity Document",
  3: "Proof of Address",
  4: "Review & Submit",
};

// ─── File upload thumbnail ────────────────────────────────────────────────────

function FileThumbnail({ file, label }: { file: File; label: string }) {
  const isImage = file.type.startsWith("image/");
  const url = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-3 rounded-md border p-2 text-sm">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="h-12 w-12 rounded object-cover border"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
          PDF
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{file.name}</p>
      </div>
    </div>
  );
}

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

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value ?? "—"}</span>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KycOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identity document files
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  // Proof of address file
  const [addressDoc, setAddressDoc] = useState<File | null>(null);

  // ── Step 1: Personal details ─────────────────────────────────────────────
  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: { fullName: "", dateOfBirth: "", nationality: "", address: "" },
  });

  // ── Step 2: Identity document ─────────────────────────────────────────────
  const identityForm = useForm<IdentityData>({
    resolver: zodResolver(identitySchema),
    defaultValues: { idType: "" },
  });

  // ── Step 3: Proof of address ──────────────────────────────────────────────
  const addressDocForm = useForm<AddressDocData>({
    resolver: zodResolver(addressDocSchema),
    defaultValues: { addressDocType: "" },
  });

  // ── Navigation helpers ────────────────────────────────────────────────────

  const handleNextFromStep1 = useCallback(async () => {
    const valid = await personalForm.trigger();
    if (valid) setStep(2);
  }, [personalForm]);

  const handleNextFromStep2 = useCallback(async () => {
    const valid = await identityForm.trigger();
    if (!valid) return;
    if (!idFront) {
      toast.error("Please upload the front of your identity document");
      return;
    }
    if (!idBack) {
      toast.error("Please upload the back of your identity document");
      return;
    }
    setStep(3);
  }, [identityForm, idFront, idBack]);

  const handleNextFromStep3 = useCallback(async () => {
    const valid = await addressDocForm.trigger();
    if (!valid) return;
    if (!addressDoc) {
      toast.error("Please upload your proof of address document");
      return;
    }
    setStep(4);
  }, [addressDocForm, addressDoc]);

  // ── Submission ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!idFront || !idBack || !addressDoc) return;

    setIsSubmitting(true);
    try {
      const personalValues = personalForm.getValues();
      const identityValues = identityForm.getValues();
      const addressDocValues = addressDocForm.getValues();

      const formData = new FormData();
      formData.append("full_name", personalValues.fullName);
      formData.append("date_of_birth", personalValues.dateOfBirth);
      formData.append("nationality", personalValues.nationality);
      formData.append("address", personalValues.address);
      formData.append("id_type", identityValues.idType);
      formData.append("id_front", idFront);
      formData.append("id_back", idBack);
      formData.append("address_doc_type", addressDocValues.addressDocType);
      formData.append("address_document", addressDoc);

      await submitKyc(formData);
      toast.success("KYC submitted successfully");
      router.push("/kyc/confirmed");
    } catch {
      toast.error("Failed to submit KYC. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [personalForm, identityForm, addressDocForm, idFront, idBack, addressDoc, router]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const personalValues = personalForm.getValues();
  const identityValues = identityForm.getValues();
  const addressDocValues = addressDocForm.getValues();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <StepIndicator current={step} />
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Step 1: Personal Details ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kyc-full-name">Full Name</Label>
              <Input
                id="kyc-full-name"
                placeholder="As it appears on your ID"
                {...personalForm.register("fullName")}
              />
              {personalForm.formState.errors.fullName && (
                <p className="text-sm text-destructive">
                  {personalForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-dob">Date of Birth</Label>
              <Input
                id="kyc-dob"
                type="date"
                {...personalForm.register("dateOfBirth")}
              />
              {personalForm.formState.errors.dateOfBirth && (
                <p className="text-sm text-destructive">
                  {personalForm.formState.errors.dateOfBirth.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-nationality">Nationality</Label>
              <Select
                onValueChange={(v) =>
                  personalForm.setValue("nationality", v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="kyc-nationality">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {personalForm.formState.errors.nationality && (
                <p className="text-sm text-destructive">
                  {personalForm.formState.errors.nationality.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-address">Residential Address</Label>
              <Input
                id="kyc-address"
                placeholder="Street, City, Country"
                {...personalForm.register("address")}
              />
              {personalForm.formState.errors.address && (
                <p className="text-sm text-destructive">
                  {personalForm.formState.errors.address.message}
                </p>
              )}
            </div>

            <Button onClick={handleNextFromStep1}>Next</Button>
          </div>
        )}

        {/* ── Step 2: Identity Document ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kyc-id-type">Document Type</Label>
              <Select
                onValueChange={(v) =>
                  identityForm.setValue("idType", v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="kyc-id-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {identityForm.formState.errors.idType && (
                <p className="text-sm text-destructive">
                  {identityForm.formState.errors.idType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-id-front">Front of Document</Label>
              <Input
                id="kyc-id-front"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setIdFront(f);
                }}
              />
              {idFront && <FileThumbnail file={idFront} label="Front" />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-id-back">Back of Document</Label>
              <Input
                id="kyc-id-back"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setIdBack(f);
                }}
              />
              {idBack && <FileThumbnail file={idBack} label="Back" />}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleNextFromStep2}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Proof of Address ──────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kyc-addr-doc-type">Document Type</Label>
              <Select
                onValueChange={(v) =>
                  addressDocForm.setValue("addressDocType", v, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="kyc-addr-doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addressDocForm.formState.errors.addressDocType && (
                <p className="text-sm text-destructive">
                  {addressDocForm.formState.errors.addressDocType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kyc-addr-doc">Upload Document</Label>
              <Input
                id="kyc-addr-doc"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAddressDoc(f);
                }}
              />
              {addressDoc && (
                <FileThumbnail file={addressDoc} label="Proof of Address" />
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleNextFromStep3}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Personal Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Personal Details</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(1)}
                  aria-label="Edit personal details"
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <ReviewRow label="Full Name" value={personalValues.fullName} />
                <ReviewRow label="Date of Birth" value={personalValues.dateOfBirth} />
                <ReviewRow label="Nationality" value={personalValues.nationality} />
                <ReviewRow label="Address" value={personalValues.address} />
              </div>
            </div>

            <Separator />

            {/* Identity Document */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Identity Document</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(2)}
                  aria-label="Edit identity document"
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm mb-3">
                <ReviewRow label="Document Type" value={identityValues.idType} />
              </div>
              <div className="flex gap-3 flex-wrap">
                {idFront && <FileThumbnail file={idFront} label="Front" />}
                {idBack && <FileThumbnail file={idBack} label="Back" />}
              </div>
            </div>

            <Separator />

            {/* Proof of Address */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Proof of Address</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep(3)}
                  aria-label="Edit proof of address"
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm mb-3">
                <ReviewRow
                  label="Document Type"
                  value={addressDocValues.addressDocType}
                />
              </div>
              {addressDoc && (
                <FileThumbnail file={addressDoc} label="Proof of Address" />
              )}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit KYC"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
