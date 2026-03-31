import { Badge } from "@/components/ui/badge";

type Status = "pending" | "approved" | "rejected" | "present" | "absent";

const statusStyles: Record<Status, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  approved: "bg-success/20 text-success border-success/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  present: "bg-success/20 text-success border-success/30",
  absent: "bg-destructive/20 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={statusStyles[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
