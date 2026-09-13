import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-foreground/70">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link href="/" className="text-sm font-medium text-brand hover:underline">
          Back to Home
        </Link>
      </div>
    </Container>
  );
}
