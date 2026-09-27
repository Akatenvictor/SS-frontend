"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowUp, ArrowDown } from "lucide-react";

interface CreatorKeyRating {
  id: string;
  title: string;
  creatorName: string;
  averageRating: number;
  ratingCount: number;
  price: number;
}

type SortField = "rating" | "count";

async function fetchKeyRatings(): Promise<CreatorKeyRating[]> {
  const res = await fetch("/api/marketplace/key-ratings");
  if (!res.ok) throw new Error("Failed to fetch key ratings");
  return res.json();
}

function SortButton({
  label,
  field,
  activeField,
  activeDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: SortField | null;
  activeDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  const isActive = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
    >
      {label}
      {isActive && activeDirection === "asc" && <ArrowUp className="size-3" />}
      {isActive && activeDirection === "desc" && <ArrowDown className="size-3" />}
    </button>
  );
}

export default function RatingsLeaderboardPage() {
  usePageTitle("Key Ratings Leaderboard");
  const [minRatingCount, setMinRatingCount] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: allKeys, isLoading } = useQuery({
    queryKey: ["key-ratings"],
    queryFn: fetchKeyRatings,
    refetchInterval: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!allKeys) return [];

    let result = allKeys.filter((key) => key.ratingCount >= minRatingCount);

    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0;
        if (sortField === "rating") {
          comparison = a.averageRating - b.averageRating;
        } else {
          comparison = a.ratingCount - b.ratingCount;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else {
      result.sort((a, b) => b.averageRating - a.averageRating);
    }

    return result;
  }, [allKeys, minRatingCount, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Key Ratings Leaderboard</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Key Ratings Leaderboard</h1>
          <p className="text-muted-foreground">
            Discover top-rated creator keys ranked by holder ratings
          </p>
        </div>

        <Card data-testid="leaderboard-filters">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="min-rating-count" className="text-sm font-medium block mb-2">
                  Minimum Rating Count
                </label>
                <Input
                  id="min-rating-count"
                  type="number"
                  min="0"
                  value={minRatingCount}
                  onChange={(e) => setMinRatingCount(Math.max(0, parseInt(e.target.value) || 0))}
                  data-testid="min-rating-filter"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setMinRatingCount(0)}
                data-testid="clear-filter-button"
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-sm">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Key Name</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Creator</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  <SortButton
                    label="Avg Rating"
                    field="rating"
                    activeField={sortField}
                    activeDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm">
                  <SortButton
                    label="Rating Count"
                    field="count"
                    activeField={sortField}
                    activeDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Price</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No keys match your filter criteria
                  </td>
                </tr>
              ) : (
                filtered.map((key, idx) => (
                  <tr key={key.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <Badge variant="outline" data-testid={`rank-${idx + 1}`}>
                        #{idx + 1}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 font-medium">{key.title}</td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {key.creatorName}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {key.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-muted-foreground">
                      {key.ratingCount}
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      {key.price.toLocaleString()} XLM
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/marketplace/${key.id}`}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
