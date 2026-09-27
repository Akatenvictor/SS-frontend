import { CreatorProfile } from "@/components/profile/CreatorProfile";
import { InvestorReputation } from "@/components/profile/InvestorReputation";

/**
 * Public creator profile page (#319) with investor reputation (#342).
 *
 * Loads a seller's public profile by wallet address route param. Publicly
 * accessible — no wallet connection or authentication required.
 */
export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const decoded = decodeURIComponent(wallet);

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <CreatorProfile wallet={decoded} />
      <InvestorReputation wallet={decoded} />
    </main>
  );
}
