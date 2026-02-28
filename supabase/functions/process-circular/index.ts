import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { circular_id } = await req.json();

    // If specific circular_id, process that one; otherwise process all unprocessed
    let circulars;
    if (circular_id) {
      const { data, error } = await supabase
        .from("circulars")
        .select("*")
        .eq("id", circular_id)
        .single();
      if (error) throw error;
      circulars = [data];
    } else {
      const { data, error } = await supabase
        .from("circulars")
        .select("*")
        .eq("status", "scraped")
        .limit(10);
      if (error) throw error;
      circulars = data || [];
    }

    const results = [];

    for (const circular of circulars) {
      // Mark as processing
      await supabase
        .from("circulars")
        .update({ status: "processing" })
        .eq("id", circular.id);

      let retries = 2;
      let success = false;

      while (retries > 0 && !success) {
        try {
          const textToAnalyze = circular.raw_text || circular.title;
          
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `You are an Indian regulatory compliance expert. Analyze the given regulatory circular and extract structured compliance information. You MUST respond using the extract_compliance_data function.`,
                },
                {
                  role: "user",
                  content: `Analyze this regulatory circular from ${circular.source}:\n\nTitle: ${circular.title}\n\nContent:\n${textToAnalyze?.substring(0, 8000)}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_compliance_data",
                    description: "Extract structured compliance data from a regulatory circular",
                    parameters: {
                      type: "object",
                      properties: {
                        summary: { type: "string", description: "Executive summary, max 200 words" },
                        effective_date: { type: "string", description: "Effective date in YYYY-MM-DD format, or null if not specified" },
                        entity_types_affected: {
                          type: "array",
                          items: { type: "string", enum: ["Pvt Ltd", "LLP", "NBFC", "Listed", "Startup", "All"] },
                          description: "Entity types affected",
                        },
                        industries_affected: {
                          type: "array",
                          items: { type: "string" },
                          description: "Industries impacted",
                        },
                        compliance_action: { type: "string", description: "Required compliance action" },
                        due_date: { type: "string", description: "Due date in YYYY-MM-DD format, or null" },
                        risk_level: { type: "string", enum: ["low", "medium", "high"] },
                        immediate_action: { type: "boolean", description: "Whether immediate action is required" },
                        compliance_required: { type: "boolean" },
                      },
                      required: ["summary", "entity_types_affected", "industries_affected", "compliance_action", "risk_level", "immediate_action", "compliance_required"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_compliance_data" } },
            }),
          });

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error("AI error:", aiResponse.status, errText);
            if (aiResponse.status === 429 || aiResponse.status === 402) {
              throw new Error(`AI rate limited or payment required: ${aiResponse.status}`);
            }
            throw new Error(`AI error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (!toolCall) {
            throw new Error("No tool call in AI response");
          }

          const extracted = JSON.parse(toolCall.function.arguments);

          // Update circular with summary and status
          await supabase
            .from("circulars")
            .update({
              summary: extracted.summary,
              effective_date: extracted.effective_date || null,
              compliance_required: extracted.compliance_required,
              status: "processed",
            })
            .eq("id", circular.id);

          // Create impact entries for each entity type
          for (const entityType of extracted.entity_types_affected) {
            for (const industry of extracted.industries_affected) {
              await supabase.from("circular_impact").insert({
                circular_id: circular.id,
                entity_type: entityType,
                industry_type: industry,
                impact_summary: extracted.summary,
                compliance_action: extracted.compliance_action,
                risk_level: extracted.risk_level,
                due_date: extracted.due_date || null,
                immediate_action: extracted.immediate_action,
              });
            }
          }

          // If no specific industries, create one general entry per entity type
          if (extracted.industries_affected.length === 0) {
            for (const entityType of extracted.entity_types_affected) {
              await supabase.from("circular_impact").insert({
                circular_id: circular.id,
                entity_type: entityType,
                industry_type: "All",
                impact_summary: extracted.summary,
                compliance_action: extracted.compliance_action,
                risk_level: extracted.risk_level,
                due_date: extracted.due_date || null,
                immediate_action: extracted.immediate_action,
              });
            }
          }

          results.push({ circular_id: circular.id, status: "processed" });
          success = true;
        } catch (aiErr) {
          retries--;
          console.error(`AI processing error (retries left: ${retries}):`, aiErr);
          if (retries === 0) {
            await supabase
              .from("circulars")
              .update({ status: "failed" })
              .eq("id", circular.id);
            results.push({ circular_id: circular.id, status: "failed", error: (aiErr as Error).message });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Process error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
