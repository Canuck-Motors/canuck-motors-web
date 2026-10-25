import { UberTestForm } from "./UberTestForm";

export const metadata = { title: "Uber Direct test" };

export default function UberAdminPage() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-black">Uber Direct (test mode)</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm text-black/60">
        Get a quote, then book a test delivery. In Uber test mode no real courier is sent and nothing is charged.
      </p>
      <UberTestForm />
    </div>
  );
}
