"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, AlertCircle, FileText, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKycSubmit, useDocumentUpload, useKycStatus, type KycFormData, type KycStep, validateStep, initialKycFormData } from "@/hooks/useKyc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS: { step: KycStep; title: string; description: string }[] = [
  { step: 1, title: "Business Details", description: "Company information and registration" },
  { step: 2, title: "Director Details", description: "Director information and ID document" },
  { step: 3, title: "Regulatory Documents", description: "Required compliance documents" },
  { step: 4, title: "Review & Submit", description: "Review all information before submitting" },
];

function FileUpload({
  label,
  value,
  onUpload,
  onRemove,
  accept,
}: {
  label: string;
  value: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  accept: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => setPreview(event.target?.result as string);
        reader.readAsDataURL(file);
      }
      onUpload(file);
    }
  };

  const fileName = value.split("/").pop() || "";
  const isImage = value && (value.includes(".jpg") || value.includes(".jpeg") || value.includes(".png"));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="sr-only"
          id={`upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <label
          htmlFor={`upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
            value ? "border-green-500 bg-green-50" : "border-muted hover:border-primary/50"
          )}
        >
          {isImage && preview ? (
            <Image src={preview} alt="Preview" width={200} height={200} className="max-h-32 max-w-full rounded" />
          ) : value ? (
            <div className="flex items-center gap-2 text-green-600">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{fileName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Click to upload or drag and drop</p>
              <p className="text-xs">PDF, JPG, PNG up to 10MB</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  data,
  onEdit,
}: {
  title: string;
  data: { label: string; value: string }[];
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.label} className="space-y-1">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="font-medium">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KycOnboarding() {
  const [currentStep, setCurrentStep] = useState<KycStep>(1);
  const [formData, setFormData] = useState<KycFormData>(initialKycFormData);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: kycStatus } = useKycStatus();
  const submitMutation = useKycSubmit();
  const uploadMutation = useDocumentUpload();

  const handleNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as KycStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as KycStep);
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    const allErrors = [
      ...validateStep(1, formData),
      ...validateStep(2, formData),
      ...validateStep(3, formData),
    ];
    if (allErrors.length > 0) {
      setErrors(allErrors);
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        business_details: formData.businessDetails,
        director_details: formData.directorDetails,
        regulatory_documents: formData.regulatoryDocuments,
      });
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (field: keyof KycFormData["regulatoryDocuments"] | "id_document_url", file: File) => {
    try {
      const { url } = await uploadMutation.mutateAsync(file);
      if (field === "id_document_url") {
        setFormData((prev) => ({
          ...prev,
          directorDetails: { ...prev.directorDetails, id_document_url: url },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          regulatoryDocuments: { ...prev.regulatoryDocuments, [field]: url },
        }));
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleFileRemove = (field: keyof KycFormData["regulatoryDocuments"] | "id_document_url") => {
    if (field === "id_document_url") {
      setFormData((prev) => ({
        ...prev,
        directorDetails: { ...prev.directorDetails, id_document_url: "" },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        regulatoryDocuments: { ...prev.regulatoryDocuments, [field]: "" },
      }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.businessDetails.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessDetails: { ...prev.businessDetails, company_name: e.target.value } }))}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                value={formData.businessDetails.registration_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessDetails: { ...prev.businessDetails, registration_number: e.target.value } }))}
                placeholder="Enter registration number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.businessDetails.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessDetails: { ...prev.businessDetails, country: e.target.value } }))}
                placeholder="Enter country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.businessDetails.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessDetails: { ...prev.businessDetails, address: e.target.value } }))}
                placeholder="Enter full address"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="director_name">Director Full Name</Label>
              <Input
                id="director_name"
                value={formData.directorDetails.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, directorDetails: { ...prev.directorDetails, name: e.target.value } }))}
                placeholder="Enter director full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.directorDetails.date_of_birth}
                onChange={(e) => setFormData((prev) => ({ ...prev, directorDetails: { ...prev.directorDetails, date_of_birth: e.target.value } }))}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>ID Document</Label>
              <FileUpload
                label="ID Document"
                value={formData.directorDetails.id_document_url}
                onUpload={(file) => handleFileUpload("id_document_url", file)}
                onRemove={() => handleFileRemove("id_document_url")}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <FileUpload
              label="Certificate of Incorporation"
              value={formData.regulatoryDocuments.certificate_of_incorporation_url}
              onUpload={(file) => handleFileUpload("certificate_of_incorporation_url", file)}
              onRemove={() => handleFileRemove("certificate_of_incorporation_url")}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <FileUpload
              label="Tax ID Document"
              value={formData.regulatoryDocuments.tax_id_url}
              onUpload={(file) => handleFileUpload("tax_id_url", file)}
              onRemove={() => handleFileRemove("tax_id_url")}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <FileUpload
              label="Bank Statement (last 3 months)"
              value={formData.regulatoryDocuments.bank_statement_url}
              onUpload={(file) => handleFileUpload("bank_statement_url", file)}
              onRemove={() => handleFileRemove("bank_statement_url")}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <ReviewSection
              title="Business Details"
              data={[
                { label: "Company Name", value: formData.businessDetails.company_name },
                { label: "Registration Number", value: formData.businessDetails.registration_number },
                { label: "Country", value: formData.businessDetails.country },
                { label: "Address", value: formData.businessDetails.address },
              ]}
              onEdit={() => setCurrentStep(1)}
            />
            <ReviewSection
              title="Director Details"
              data={[
                { label: "Director Name", value: formData.directorDetails.name },
                { label: "Date of Birth", value: formData.directorDetails.date_of_birth },
                { label: "ID Document", value: formData.directorDetails.id_document_url ? "Uploaded" : "Not uploaded" },
              ]}
              onEdit={() => setCurrentStep(2)}
            />
            <ReviewSection
              title="Regulatory Documents"
              data={[
                { label: "Certificate of Incorporation", value: formData.regulatoryDocuments.certificate_of_incorporation_url ? "Uploaded" : "Not uploaded" },
                { label: "Tax ID Document", value: formData.regulatoryDocuments.tax_id_url ? "Uploaded" : "Not uploaded" },
                { label: "Bank Statement", value: formData.regulatoryDocuments.bank_statement_url ? "Uploaded" : "Not uploaded" },
              ]}
              onEdit={() => setCurrentStep(3)}
            />
          </div>
        );
    }
  };

  const isPending = kycStatus?.status === "pending";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KYC Onboarding</h1>
        <p className="text-muted-foreground mt-1">
          Complete the verification process to start issuing invoices
        </p>
      </div>

      {isPending && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Application Under Review</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              Your KYC application has been submitted and is pending review. You will be notified once the review is complete.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="1" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {STEPS.map(({ step, title }) => (
                <TabsTrigger
                  key={step}
                  value={String(step)}
                  className={cn(
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    currentStep >= step ? "" : "text-muted-foreground"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                      currentStep > step
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {currentStep > step ? <Check className="h-4 w-4" /> : step}
                    </div>
                    <span className="text-xs font-medium truncate">{title}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            <Separator className="my-6" />

            <TabsContent value="1" className="pt-0">
              {renderStepContent()}
            </TabsContent>
            <TabsContent value="2" className="pt-0">
              {renderStepContent()}
            </TabsContent>
            <TabsContent value="3" className="pt-0">
              {renderStepContent()}
            </TabsContent>
            <TabsContent value="4" className="pt-0">
              {renderStepContent()}
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep < 4 ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || submitMutation.isPending}
                >
                  {isSubmitting || submitMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4 pb-4 px-4">
            <ul className="space-y-1 text-sm text-destructive">
              {errors.map((error, i) => (
                <li key={i} className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}