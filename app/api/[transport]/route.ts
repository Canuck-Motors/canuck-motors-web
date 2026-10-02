import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { searchParts, getPart, listCategories } from "@/lib/parts";

const asText = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_parts",
      "Search Canuck Motors auto parts by name or SKU",
      { query: z.string().min(2).max(60) },
      async ({ query }) => asText(await searchParts(query))
    );

    server.tool(
      "get_part",
      "Get details for one auto part by its id",
      { id: z.string() },
      async ({ id }) => asText(await getPart(id))
    );

    server.tool(
      "list_categories",
      "List all active auto part categories",
      {},
      async () => asText(await listCategories())
    );
  },
  {},
  { basePath: "/api" }
);

export { handler as GET, handler as POST, handler as DELETE };