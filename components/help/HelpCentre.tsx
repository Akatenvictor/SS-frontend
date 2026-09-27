"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestOnboardingTourReplay } from "@/hooks/useOnboardingTour";
import {
  filterHelpArticles,
  getMostViewedArticles,
  HELP_CENTRE_CATEGORIES,
  type HelpArticle,
  type HelpArticleCategory,
} from "@/lib/helpCentre";

const CATEGORY_LABELS: Record<HelpArticleCategory, string> = {
  investors: "For investors",
  sellers: "For sellers",
  platform: "Platform",
  technical: "Technical",
};

function HelpArticleAccordionItem({ article }: { article: HelpArticle }) {
  const [open, setOpen] = useState(false);
  const bodyId = `help-article-body-${article.id}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        data-testid={`help-article-toggle-${article.id}`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium hover:text-primary"
      >
        {article.title}
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={bodyId}
          role="region"
          data-testid={`help-article-body-${article.id}`}
          className="pb-3 text-sm text-muted-foreground"
        >
          {article.body}
        </div>
      )}
    </div>
  );
}

export function HelpCentre() {
  const [query, setQuery] = useState("");
  const filtered = filterHelpArticles(query);
  const mostViewed = getMostViewedArticles();
  const isSearching = query.trim().length > 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold">Help Centre</h1>
        <p className="text-sm text-muted-foreground">
          Find answers to common questions about investing, selling and the platform.
        </p>
        <Input
          type="search"
          aria-label="Search help articles"
          placeholder="Search help articles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="help-search"
          className="max-w-md"
        />
        <p>
          <a
            href="mailto:support@stellarsettle.com"
            data-testid="help-support-link"
            className="text-sm text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => requestOnboardingTourReplay()}
            data-testid="replay-tour-button"
          >
            <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            Replay onboarding tour
          </Button>
        </div>
      </header>

      {!isSearching && (
        <section aria-label="Most viewed articles">
          <h2 className="text-lg font-semibold mb-2">Most viewed</h2>
          <div className="divide-y rounded-md border px-4" data-testid="help-most-viewed">
            {mostViewed.map((article) => (
              <HelpArticleAccordionItem key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {HELP_CENTRE_CATEGORIES.map((category) => {
        const articles = filtered.filter((article) => article.category === category);
        if (articles.length === 0) return null;

        return (
          <section key={category} aria-label={CATEGORY_LABELS[category]}>
            <h2 className="text-lg font-semibold mb-2">{CATEGORY_LABELS[category]}</h2>
            <div className="divide-y rounded-md border px-4">
              {articles.map((article) => (
                <HelpArticleAccordionItem key={article.id} article={article} />
              ))}
            </div>
          </section>
        );
      })}

      {isSearching && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="help-no-results">
          No articles found. Try a different keyword or contact support.
        </p>
      )}
    </div>
  );
}
