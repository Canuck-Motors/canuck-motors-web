import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  return (
    <main>
      <h1>Canuck Motors</h1>

      <p>Supabase connection loaded.</p>

      <pre>
        {JSON.stringify(
          {
            user: data.user,
            error: error?.message,
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}