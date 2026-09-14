import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/app/login/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  // Already-authenticated users have nothing to do here.
  const user = await getCurrentUser();
  if (user) {
    redirect("/admin");
  }

  return (
    <Container>
      <div className="mx-auto flex max-w-sm flex-col gap-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Sign in with your admin account to access the CMS and back-office.
          </p>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </Container>
  );
}
