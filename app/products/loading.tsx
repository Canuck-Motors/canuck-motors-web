import { ResultsPageSkeleton } from "@/components/Skeletons";

// Shown while any /products page (vehicle results, search) is loading
export default function Loading() {
  return <ResultsPageSkeleton />;
}
