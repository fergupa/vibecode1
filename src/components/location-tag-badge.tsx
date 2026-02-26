import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const locationColors: Record<string, string> = {
  CORPORATE: "bg-blue-100 text-blue-800 border-blue-200",
  SHARED_SERVICES: "bg-green-100 text-green-800 border-green-200",
  BUSINESS_UNIT: "bg-orange-100 text-orange-800 border-orange-200",
};

const locationLabels: Record<string, string> = {
  CORPORATE: "Corporate",
  SHARED_SERVICES: "Shared Services",
  BUSINESS_UNIT: "Business Unit",
};

type LocationTagBadgeProps = {
  location: string | null;
  inherited?: boolean;
};

export function LocationTagBadge({ location, inherited }: LocationTagBadgeProps) {
  if (!location) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        locationColors[location] || "bg-gray-100 text-gray-800",
        inherited && "opacity-60 italic"
      )}
    >
      {locationLabels[location] || location}
      {inherited && " (inherited)"}
    </Badge>
  );
}
