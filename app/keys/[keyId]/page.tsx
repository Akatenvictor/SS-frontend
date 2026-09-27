import { CreatorKeyDetail } from "@/components/keys";

interface CreatorKeyPageProps {
  params: Promise<{ keyId: string }>;
}

export default async function CreatorKeyPage({ params }: CreatorKeyPageProps) {
  const { keyId } = await params;

  return (
    <main className="container mx-auto px-4 py-8">
      <CreatorKeyDetail keyId={keyId} />
    </main>
  );
}
