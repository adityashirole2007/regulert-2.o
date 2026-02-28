import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    };

    // Step 1: Scrape
    console.log("Step 1: Scraping circulars...");
    const scrapeRes = await fetch(`${supabaseUrl}/functions/v1/scrape-circulars`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const scrapeData = await scrapeRes.json();
    console.log("Scrape result:", scrapeData);

    // Step 2: Process with AI
    console.log("Step 2: Processing with AI...");
    const processRes = await fetch(`${supabaseUrl}/functions/v1/process-circular`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const processData = await processRes.json();
    console.log("Process result:", processData);

    // Step 3: Map impact
    console.log("Step 3: Mapping impact...");
    const mapResults = [];
    if (processData.results) {
      for (const result of processData.results) {
        if (result.status === "processed") {
          const mapRes = await fetch(`${supabaseUrl}/functions/v1/map-impact`, {
            method: "POST",
            headers,
            body: JSON.stringify({ circular_id: result.circular_id }),
          });
          const mapData = await mapRes.json();
          mapResults.push(mapData);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scrape: scrapeData,
        process: processData,
        impact_mapping: mapResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Pipeline error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
