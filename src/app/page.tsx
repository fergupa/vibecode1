import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">Activity Assessment Tool</h1>
        <p className="mt-3 text-gray-600">
          Assess employee time allocation across business processes and build
          data-driven shared services business cases.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/admin">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
