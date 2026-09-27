import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Shared call-to-action back to the marketplace.
 *
 * Used by the 404 and global error pages so a user who lands on a dead route
 * always has one obvious way out.
 */
export function GoToMarketplaceButton() {
  return (
    <Button asChild>
      <Link href="/marketplace">Go to Marketplace</Link>
    </Button>
  );
}
