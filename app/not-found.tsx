import { GoToMarketplaceButton } from "@/components/layout/GoToMarketplaceButton";

/**
 * Rendered for any route the router cannot match.
 *
 * Deliberately does not log: an unmatched URL is expected user behaviour, not
 * an application fault, and logging it would bury real errors in noise.
 */
export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <GoToMarketplaceButton />
    </main>
  );
}
