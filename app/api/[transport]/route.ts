import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { searchParts, getPart, listCategories } from "@/lib/parts";

const asText = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

const handler = createMcpHandler((server) => {
  server.registerTool(
    "search_parts",
    {
      title: "Search parts",
      description: "Search Canuck Motors auto parts by name or SKU",
      inputSchema: z.object({ query: z.string().min(2).max(60) }),
    },
    async ({ query }) => asText(await searchParts(query))
  );

  server.registerTool(
    "get_part",
    {
      title: "Get part",
      description: "Get details for one auto part by its id",
      inputSchema: z.object({ id: z.string().min(1).max(60) }),
    },
    async ({ id }) => asText(await getPart(id))
  );

  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description: "List all active auto part categories",
      inputSchema: z.object({}),
    },
    async () => asText(await listCategories())
  );
});

export { handler as GET, handler as POST };
