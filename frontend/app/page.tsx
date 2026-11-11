import Link from "next/link";
import { auth } from "@/auth";
import { LoginButton } from "./components/Packd";
export default async function Home() {
  const session = await auth();
  const configured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  return (
    <main className="landing">
      <Link className="wordmark" href="/">
        Packd
      </Link>
      <div className="landing-art" aria-hidden="true">
        ↗
      </div>
      <p className="eyebrow">GOOD COMPANY. GREAT PLANS.</p>
      <h1>
        Get the trip out
        <br />
        of the group chat.
      </h1>
      <p>
        Pick the plans. Bring your people. Make a little room for adventure.
      </p>
      {session?.user ? (
        <Link className="primary" href="/trips">
          Your trips
        </Link>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {configured && <LoginButton />}
          {process.env.NODE_ENV === "development" &&
            process.env.ALLOW_DEV_LOGIN === "true" && (
              <form action="/api/auth/dev-login" method="post">
                <button className="primary" type="submit">
                  Use local demo account
                </button>
              </form>
            )}
          {!configured && (
            <p className="notice">
              Google sign-in is not configured yet. The app owner needs to
              connect it before you can join.
            </p>
          )}
        </div>
      )}
      <div className="landing-details">
        <span>Decide together</span>
        <span>Keep one shared plan</span>
        <span>Pack your own way</span>
      </div>
    </main>
  );
}
