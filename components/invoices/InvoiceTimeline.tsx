"use client";

import { CheckCircle2, Clock, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type TimelineStage =
  | "submitted"
  | "under_review"
  | "active"
  | "funded"
  | "matured"
  | "settled"
  | "rejected"
  | "expired";

interface TimelineStep {
  stage: TimelineStage;
  label: string;
  timestamp?: string;
  actor?: string;
  isRejected?: boolean;
  rejectionReason?: string;
}

const STAGE_ORDER: TimelineStage[] = [
  "submitted",
  "under_review",
  "active",
  "funded",
  "matured",
  "settled",
];

const STAGE_LABELS: Record<TimelineStage, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  active: "Active",
  funded: "Funded",
  matured: "Matured",
  settled: "Settled",
  rejected: "Rejected",
  expired: "Expired",
};

function getStageIndex(stage: TimelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function buildSteps(
  status: string,
  events?: Array<{ stage: string; timestamp?: string; actor?: string; reason?: string }>
): TimelineStep[] {
  const currentIdx = getStageIndex(status as TimelineStage);
  const isTerminal = status === "rejected" || status === "expired";

  return STAGE_ORDER.map((stage, idx) => {
    const stageEvent = events?.find((e) => e.stage === stage);
    const isCompleted = !isTerminal && currentIdx > idx;
    const isCurrent = !isTerminal && currentIdx === idx;

    return {
      stage,
      label: STAGE_LABELS[stage],
      timestamp: stageEvent?.timestamp,
      actor: stageEvent?.actor,
      isRejected: false,
    };
  }).concat(
    isTerminal
      ? [
          {
            stage: status as TimelineStage,
            label: STAGE_LABELS[status as TimelineStage] ?? status,
            timestamp: events?.find((e) => e.stage === status)?.timestamp,
            isRejected: true,
            rejectionReason: events?.find((e) => e.stage === status)?.reason,
          },
        ]
      : []
  );
}

interface InvoiceTimelineProps {
  status: string;
  events?: Array<{ stage: string; timestamp?: string; actor?: string; reason?: string }>;
}

export function InvoiceTimeline({ status, events }: InvoiceTimelineProps) {
  const steps = buildSteps(status, events);
  const currentIdx = getStageIndex(status as TimelineStage);
  const isTerminal = status === "rejected" || status === "expired";

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Invoice Timeline</h2>
      </CardHeader>
      <CardContent>
        {/* Desktop: full timeline */}
        <div className="hidden md:block">
          <div className="relative">
            {steps.map((step, idx) => {
              const isCompleted = !isTerminal && currentIdx > idx;
              const isCurrent = !isTerminal && currentIdx === idx;
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.stage} className="flex gap-4 pb-8 last:pb-0">
                  <div className="flex flex-col items-center">
                    {step.isRejected ? (
                      <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    ) : isCurrent ? (
                      <Clock className="h-6 w-6 text-blue-500 shrink-0" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                    )}
                    {!isLast && (
                      <div
                        className={`w-px flex-1 mt-2 ${
                          isCompleted ? "bg-emerald-500" : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-2 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        isCurrent
                          ? "text-blue-500"
                          : isCompleted
                          ? "text-foreground"
                          : step.isRejected
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(step.timestamp).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {step.actor && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {step.actor.slice(0, 8)}...
                      </p>
                    )}
                    {step.isRejected && step.rejectionReason && (
                      <p className="text-xs text-red-400 mt-1">
                        {step.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: compact stepper */}
        <div className="md:hidden">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {steps.map((step, idx) => {
              const isCompleted = !isTerminal && currentIdx > idx;
              const isCurrent = !isTerminal && currentIdx === idx;

              return (
                <div key={step.stage} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      step.isRejected
                        ? "bg-red-500/20 text-red-500"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-500"
                        : isCurrent
                        ? "bg-blue-500/20 text-blue-500 ring-2 ring-blue-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.isRejected ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-4 h-px ${
                        isCompleted ? "bg-emerald-500" : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {STAGE_LABELS[status as TimelineStage] ?? status}
            {isTerminal && status === "rejected" && (
              <span className="text-red-500 ml-1">(Rejected)</span>
            )}
            {isTerminal && status === "expired" && (
              <span className="text-red-500 ml-1">(Expired)</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
