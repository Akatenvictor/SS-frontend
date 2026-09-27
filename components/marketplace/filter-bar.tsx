"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InvoiceStatus = "open" | "funded" | "settled";

interface MarketplaceFilterBarProps {
  status: InvoiceStatus | "all";
  search: string;
  onStatusChange: (value: InvoiceStatus | "all") => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export function MarketplaceFilterBar({
  status,
  search,
  onStatusChange,
  onSearchChange,
  onClear,
}: MarketplaceFilterBarProps) {
  const hasFilters = status !== "all" || search.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as InvoiceStatus | "all")}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="funded">Funded</SelectItem>
          <SelectItem value="settled">Settled</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
