import type { APIRoute } from "astro";
import { data, dataMode } from "../../lib/data";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        notice:
          dataMode === "demo"
            ? "Demonstration data only; not verified infrastructure facts."
            : "Source-backed records; claims and geometry are included only where reviewed.",
        dataMode,
        states: data.states,
        cities: data.cities,
        agencies: data.agencies,
        sources: data.sources,
        projects: data.projects,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
