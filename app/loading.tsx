import RoadLoader from "@/components/RoadLoader";

// Shown while any page without its own loading screen is rendering
export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-white">
      <RoadLoader label="Loading" />
    </main>
  );
}
