import LoadingAnimation from "@/components/LoadingAnimation";

// Shown while any page without its own loading screen is rendering
export default function Loading() {
  return <LoadingAnimation variant="page" />;
}
