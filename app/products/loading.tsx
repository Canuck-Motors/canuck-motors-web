import RoadLoader from "@/components/RoadLoader";

// Shown while any /products page (vehicle results, search) is loading
export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-white">
      <RoadLoader />
    </main>
  );
}
