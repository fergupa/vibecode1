import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  message?: string;
};

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}
