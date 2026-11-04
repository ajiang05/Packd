import { TripWorkspace } from "@/app/components/Packd";
export default async function Page({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripWorkspace key={tripId} tripId={tripId} section="budget" />;
}
