import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Activity,
  BarChart3,
  Zap,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const riskColor = (risk: string) => {
  switch (risk) {
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    case "low": return "bg-success/10 text-success border-success/20";
    default: return "";
  }
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

const Dashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ clients: 0, circulars: 0, highRisk: 0, deadlines: 0 });
  const [recentCirculars, setRecentCirculars] = useState<any[]>([]);
  const [clientHealth, setClientHealth] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    if (!profile?.firm_id) return;

    try {
      // Fetch counts in parallel
      const [clientsRes, circularsRes, tasksRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("firm_id", profile.firm_id),
        supabase.from("circulars").select("id", { count: "exact", head: true }).gte("published_date", new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0]),
        supabase.from("compliance_tasks").select("*").eq("firm_id", profile.firm_id),
      ]);

      const tasks = tasksRes.data || [];
      const highRisk = tasks.filter(t => t.risk_level === "high" && t.status !== "completed").length;
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const deadlines = tasks.filter(t => t.due_date && t.due_date <= thirtyDaysFromNow && t.status !== "completed").length;

      setStats({
        clients: clientsRes.count || 0,
        circulars: circularsRes.count || 0,
        highRisk,
        deadlines,
      });

      // Recent circulars
      const { data: circulars } = await supabase
        .from("circulars")
        .select("*, circular_impact(*)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentCirculars(circulars || []);

      // Client health
      const { data: clients } = await supabase
        .from("clients")
        .select("id, client_name")
        .eq("firm_id", profile.firm_id);

      const healthData = [];
      for (const client of (clients || [])) {
        const { data: clientTasks } = await supabase
          .from("compliance_tasks")
          .select("status, risk_level")
          .eq("client_id", client.id);

        const total = clientTasks?.length || 0;
        const completed = clientTasks?.filter(t => t.status === "completed").length || 0;
        const overdue = clientTasks?.filter(t => t.status === "overdue").length || 0;
        const score = total > 0 ? Math.round(((completed) / total) * 100) : 100;

        healthData.push({
          name: client.client_name,
          score,
          tasks: total,
          overdue,
        });
      }
      setClientHealth(healthData);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.firm_id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-pipeline");
      if (error) throw error;
      toast({ title: "Pipeline complete", description: `Scraped ${data?.scrape?.scraped || 0} new circulars` });
      await fetchDashboardData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskFromImpact = (circular: any) => {
    const impacts = circular.circular_impact || [];
    if (impacts.some((i: any) => i.risk_level === "high")) return "high";
    if (impacts.some((i: any) => i.risk_level === "medium")) return "medium";
    return "low";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Compliance overview for your firm</p>
        </div>
        <Button className="gap-2 glow w-full sm:w-auto" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {refreshing ? "Running..." : "Refresh Updates"}
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Clients" value={stats.clients} change="Active clients" changeType="neutral" icon={Users} delay={0} />
        <StatCard title="New Circulars" value={stats.circulars} change="Last 10 days" changeType="neutral" icon={FileText} iconColor="bg-info/10 text-info" delay={0.05} />
        <StatCard title="High Risk Alerts" value={stats.highRisk} change="Active alerts" changeType={stats.highRisk > 0 ? "negative" : "neutral"} icon={AlertTriangle} iconColor="bg-destructive/10 text-destructive" delay={0.1} />
        <StatCard title="Upcoming Deadlines" value={stats.deadlines} change="Next 30 days" changeType="neutral" icon={Clock} iconColor="bg-warning/10 text-warning" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recent Regulatory Updates
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/regulatory-feed")}>
              View All <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentCirculars.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No circulars yet. Click "Refresh Updates" to scrape latest regulatory data.</p>
            ) : (
              recentCirculars.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 min-w-[40px] justify-center border-primary/30 text-primary">{c.source}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.published_date || new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${riskColor(getRiskFromImpact(c))}`}>
                    {getRiskFromImpact(c)}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" /> Client Health
          </h2>
          <div className="space-y-4">
            {clientHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No clients added yet.</p>
            ) : (
              clientHealth.map((client, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{client.name}</span>
                    <span className={`text-sm font-bold ${scoreColor(client.score)}`}>{client.score}%</span>
                  </div>
                  <Progress value={client.score} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{client.tasks} tasks</span>
                    {client.overdue > 0 && <span className="text-destructive">{client.overdue} overdue</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
