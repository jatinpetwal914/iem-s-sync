import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/config/routes";

export default function NotFound() {
  return (
    <EmptyState
      eyebrow="ACCESS"
      title="This surface is not available."
      message="The requested route does not exist, or you do not have access to it."
      actionHref={routes.home}
      actionLabel="Back to IEM Sync"
    />
  );
}
