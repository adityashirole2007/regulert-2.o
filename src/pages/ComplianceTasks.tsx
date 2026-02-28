import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, CheckCircle2, Clock, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusFilters = ["All", "pending", "completed", "overdue"];

const statusIcon = (s: string) => {
  switch (s) {
    case "completed": return <CheckCircle2 className="w-4 h-4 text-success" />;
    case "overdue": return <AlertTriangle className="w-4 h-4 text-destructive" />;
    default: return <Clock className="w-4 h-4 text-warning" />;
  }
};

const riskColor = (r: string) => {
  switch (r) {
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    default: return "bg-success/10 text-success border-success/20";
  }
};

const ComplianceTasks = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!profile?.firm_id) return;
    const { data, error } = await supabase
      .from("compliance_tasks")
      .select("*, clients(client_name), circulars(source, title)")
      .eq("firm_id", profile.firm_id)
      .order("due_date", { ascending: true });

    if (!error) setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [profile?.firm_id]);

  const handleMarkDone = async (taskId: string) => {
    const { error } = await supabase
      .from("compliance_tasks")
      .update({ status: "completed" as any })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task completed" });
      fetchTasks();
    }
  };

  const filtered = tasks
    .filter(t => activeFilter === "All" || t.status === activeFilter)
    .filter(t => t.task_title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(t => t.status === "overdue").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage all compliance obligations</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Pending", count: counts.pending, color: "text-warning" },
          { label: "Overdue", count: counts.overdue, color: "text-destructive" },
          { label: "Completed", count: counts.completed, color: "text-success" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9 bg-muted/50 border-border/50 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          {statusFilters.map(s => (
            <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)} className="text-xs h-8 capitalize">{s}</Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No tasks found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={cn("glass-card-hover p-4 flex items-center gap-4", t.status === "overdue" && "border-destructive/20")}>
              {statusIcon(t.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.task_title}</p>
                <p className="text-xs text-muted-foreground">{t.clients?.client_name || "—"} · via {t.circulars?.source || "Manual"}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <Badge variant="outline" className={`text-[10px] ${riskColor(t.risk_level)}`}>{t.risk_level}</Badge>
                {t.due_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {t.due_date}
                  </div>
                )}
              </div>
              {t.status !== "completed" && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleMarkDone(t.id)}>Mark Done</Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplianceTasks;
