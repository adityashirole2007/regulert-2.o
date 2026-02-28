import { useState } from "react";
import { motion } from "framer-motion";
import { FileDown, FileText, Shield, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const reportTypes = [
  { title: "Client Compliance Summary", description: "Comprehensive compliance status across all clients with task completion rates", icon: FileText, category: "Compliance" },
  { title: "Monthly Regulatory Impact Report", description: "Analysis of regulatory changes and their impact on your client portfolio", icon: TrendingUp, category: "Regulatory" },
  { title: "Risk Exposure Report", description: "Detailed risk scoring with overdue tasks, high-risk items, and mitigation recommendations", icon: Shield, category: "Risk" },
];

const Reports = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (type: string) => {
    if (!profile?.firm_id) return;
    setGenerating(type);

    try {
      // Fetch data based on report type
      let content = "";
      const today = new Date().toISOString().split("T")[0];

      if (type === "Compliance") {
        const { data: clients } = await supabase
          .from("clients")
          .select("*, compliance_tasks(status, risk_level, task_title, due_date)")
          .eq("firm_id", profile.firm_id);

        content = `CLIENT COMPLIANCE SUMMARY\nGenerated: ${today}\n\n`;
        for (const client of (clients || [])) {
          const tasks = client.compliance_tasks || [];
          const completed = tasks.filter((t: any) => t.status === "completed").length;
          content += `\n${client.client_name} (${client.entity_type || "N/A"})\n`;
          content += `  Total Tasks: ${tasks.length} | Completed: ${completed} | Pending: ${tasks.length - completed}\n`;
          tasks.forEach((t: any) => {
            content += `  - [${t.status.toUpperCase()}] ${t.task_title} (Due: ${t.due_date || "N/A"}) [${t.risk_level}]\n`;
          });
        }
      } else if (type === "Regulatory") {
        const tenDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const { data: circulars } = await supabase
          .from("circulars")
          .select("*, circular_impact(*)")
          .gte("created_at", tenDaysAgo)
          .order("created_at", { ascending: false });

        content = `MONTHLY REGULATORY IMPACT REPORT\nGenerated: ${today}\n\n`;
        for (const c of (circulars || [])) {
          content += `\n[${c.source}] ${c.title}\n`;
          content += `  Published: ${c.published_date || "N/A"} | Status: ${c.status}\n`;
          if (c.summary) content += `  Summary: ${c.summary}\n`;
        }
      } else {
        const { data: tasks } = await supabase
          .from("compliance_tasks")
          .select("*, clients(client_name)")
          .eq("firm_id", profile.firm_id);

        const highRisk = (tasks || []).filter(t => t.risk_level === "high");
        const overdue = (tasks || []).filter(t => t.status === "overdue");

        content = `RISK EXPOSURE REPORT\nGenerated: ${today}\n\n`;
        content += `Total Tasks: ${tasks?.length || 0}\n`;
        content += `High Risk: ${highRisk.length}\n`;
        content += `Overdue: ${overdue.length}\n\n`;
        content += `HIGH RISK ITEMS:\n`;
        highRisk.forEach(t => {
          content += `  - ${t.task_title} (${t.clients?.client_name || "N/A"}) Due: ${t.due_date || "N/A"}\n`;
        });
        content += `\nOVERDUE ITEMS:\n`;
        overdue.forEach(t => {
          content += `  - ${t.task_title} (${t.clients?.client_name || "N/A"}) Due: ${t.due_date || "N/A"}\n`;
        });
      }

      // Download as text file
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type.toLowerCase()}-report-${today}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Report generated", description: `${type} report downloaded.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate and download compliance reports</p>
      </motion.div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {reportTypes.map((r, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card-hover p-6 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <r.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{r.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
            </div>
            <Button className="gap-2 mt-auto" size="sm" onClick={() => generateReport(r.category)} disabled={generating === r.category}>
              {generating === r.category ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Generate Report
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
