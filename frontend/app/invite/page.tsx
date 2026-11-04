import { auth } from "@/auth";
import { AcceptInvitation } from "@/app/components/Packd";

export default async function Page() {
  const session = await auth();
  return <AcceptInvitation user={session?.user} />;
}

