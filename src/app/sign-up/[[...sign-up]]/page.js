import { SignUp } from "@clerk/nextjs";

import ClerkSetupCard from "@/components/clerk-setup-card";
import { hasClerkCredentials } from "@/lib/clerk-config";

const shellStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px 16px",
  background:
    "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,220,132,0.08), transparent 70%), #0d1a1f",
};

export default function SignUpPage() {
  if (!hasClerkCredentials()) {
    return (
      <main style={shellStyle}>
        <ClerkSetupCard
          title="Sign up is waiting on your Clerk keys"
          message="Add the Clerk environment variables from the setup steps, then revisit /sign-up to use the hosted auth flow."
        />
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <SignUp />
    </main>
  );
}
