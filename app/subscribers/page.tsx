import { SubscriberManagerV2 } from "@/components/subscriber-manager-v2";
import { PageHeader } from "@/components/page-header";

export default function SubscribersPage() {
  return (
    <div className="container mx-auto py-10 px-4">
    

      <PageHeader
        title="Subscribers"
        description="          Manage your subscriber list using SheetDB
"
        variant="gradient"
      />

      <SubscriberManagerV2 />
    </div>
  );
}
