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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { circular_id } = await req.json();

    // Get all impacts for this circular
    const { data: impacts, error: impactError } = await supabase
      .from("circular_impact")
      .select("*")
      .eq("circular_id", circular_id);

    if (impactError) throw impactError;
    if (!impacts || impacts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No impacts to map", tasks_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the circular details
    const { data: circular } = await supabase
      .from("circulars")
      .select("title, source")
      .eq("id", circular_id)
      .single();

    // Get all clients
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("*");

    if (clientError) throw clientError;

    let tasksCreated = 0;

    for (const impact of impacts) {
      for (const client of (clients || [])) {
        // Match entity type
        const entityMatch = impact.entity_type === "All" || 
          client.entity_type?.toLowerCase() === impact.entity_type?.toLowerCase();
        
        // Match industry
        const industryMatch = impact.industry_type === "All" || 
          client.industry_type?.toLowerCase() === impact.industry_type?.toLowerCase();

        if (entityMatch && industryMatch) {
          // Check if task already exists for this client + circular combo
          const { data: existingTask } = await supabase
            .from("compliance_tasks")
            .select("id")
            .eq("client_id", client.id)
            .eq("circular_id", circular_id)
            .single();

          if (existingTask) continue;

          // Create compliance task
          const { error: taskError } = await supabase.from("compliance_tasks").insert({
            client_id: client.id,
            firm_id: client.firm_id,
            circular_id: circular_id,
            task_title: `${circular?.source || "Regulatory"}: ${impact.compliance_action || circular?.title}`.substring(0, 500),
            description: impact.impact_summary,
            due_date: impact.due_date || null,
            status: "pending",
            risk_level: impact.risk_level || "low",
          });

          if (taskError) {
            console.error("Task creation error:", taskError);
          } else {
            tasksCreated++;

            // Create notification for firm users if high risk
            if (impact.risk_level === "high") {
              const { data: firmProfiles } = await supabase
                .from("profiles")
                .select("id")
                .eq("firm_id", client.firm_id);

              for (const profile of (firmProfiles || [])) {
                await supabase.from("notifications").insert({
                  user_id: profile.id,
                  title: "High Risk Alert",
                  message: `New high-risk compliance task for ${client.client_name}: ${impact.compliance_action || circular?.title}`,
                  type: "high_risk",
                });
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, tasks_created: tasksCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Impact mapping error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
