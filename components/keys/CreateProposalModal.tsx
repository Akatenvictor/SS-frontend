"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProposalMutation } from "@/hooks/useCreatorKeys";

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;
const DURATION_OPTIONS = [1, 3, 7, 14] as const;

interface CreateProposalModalProps {
  keyId: string;
}

export function CreateProposalModal({ keyId }: CreateProposalModalProps) {
  const { address, jwt } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationDays, setDurationDays] = useState<number>(7);
  const createMutation = useCreateProposalMutation(keyId);

  const filledOptionsCount = useMemo(
    () => options.filter((option) => option.trim().length > 0).length,
    [options]
  );

  const canSubmit =
    Boolean(address) &&
    title.trim().length > 0 &&
    filledOptionsCount >= MIN_OPTIONS &&
    !createMutation.isPending;

  const reset = () => {
    setTitle("");
    setOptions(["", ""]);
    setDurationDays(7);
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!address || !canSubmit) return;

    await createMutation.mutateAsync({
      input: {
        title: title.trim(),
        options: options.map((option) => option.trim()).filter(Boolean),
        durationDays,
      },
      walletAddress: address,
      token: jwt,
    });
    setOpen(false);
    reset();
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="create-proposal-button"
      >
        Create Proposal
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold">Create Proposal</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  aria-label="Close create proposal modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="proposal-title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="proposal-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Proposal title"
                  data-testid="proposal-title-input"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Options</span>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(event) =>
                        handleOptionChange(index, event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      data-testid={`proposal-option-input-${index}`}
                    />
                    {options.length > MIN_OPTIONS && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={options.length >= MAX_OPTIONS}
                  data-testid="add-option-button"
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                <label htmlFor="proposal-duration" className="text-sm font-medium">
                  Duration
                </label>
                <Select
                  value={String(durationDays)}
                  onValueChange={(value) => setDurationDays(Number(value))}
                >
                  <SelectTrigger id="proposal-duration" data-testid="proposal-duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {days} {days === 1 ? "day" : "days"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="submit-proposal-button"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {createMutation.isPending ? "Signing..." : "Create Proposal"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
