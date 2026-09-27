"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";

interface DeadlineExtensionFormProps {
  currentDeadline: string;
  invoiceStatus: string;
  invoiceId: string;
  onRequest?: (newDeadline: string) => Promise<void>;
}

type RequestState = "idle" | "submitting" | "pending" | "approved" | "rejected";

export function DeadlineExtensionForm({
  currentDeadline,
  invoiceStatus,
  invoiceId,
  onRequest,
}: DeadlineExtensionFormProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const currentDeadlineDate = new Date(currentDeadline);
  const minDate = new Date(currentDeadlineDate.getTime() + 86400000); // +1 day
  const minDateStr = minDate.toISOString().split("T")[0];

  const isAvailable = invoiceStatus === "open" || invoiceStatus === "active";
  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
  const isValidSelection = selectedDateObj && selectedDateObj > currentDeadlineDate;

  const handleSubmit = async () => {
    if (!isValidSelection || !onRequest) return;
    setState("submitting");
    try {
      await onRequest(selectedDate);
      setState("pending");
    } catch {
      setState("idle");
    }
  };

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Deadline Extension
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Extension requests are only available for active, unfunded invoices.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Deadline Extension
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Current deadline:{" "}
          <span className="font-medium text-foreground">
            {currentDeadlineDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {state === "pending" && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10 text-blue-500 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Extension request pending admin review.
          </div>
        )}

        {state === "approved" && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 text-emerald-500 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Extension approved! New deadline is now active.
          </div>
        )}

        {state === "rejected" && rejectionReason && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 text-red-500 text-sm">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Extension rejected</p>
              <p className="text-xs mt-1 opacity-80">{rejectionReason}</p>
            </div>
          </div>
        )}

        {(state === "idle" || state === "rejected") && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-deadline" className="text-sm">
                Proposed new deadline
              </Label>
              <Input
                id="new-deadline"
                type="date"
                min={minDateStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 1 day after the current deadline.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!isValidSelection || state === "submitting"}
              size="sm"
            >
              {state === "submitting" ? "Submitting..." : "Request Extension"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
