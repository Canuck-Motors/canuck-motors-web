import { PageSkeleton } from "@/components/Skeletons";

// Shown while any page without its own loading screen is rendering
export default function Loading() {
  return <PageSkeleton />;
}
