import { SubscriberManagerV2 } from "@/components/subscriber-manager-v2";
import { PageHeader } from "@/components/page-header";

export default function SubscribersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Subscribers"
          description="Manage your Subscribers"
          variant="gradient"
        />
        <SubscriberManagerV2 />
      </div>
    </div>
  );
}
