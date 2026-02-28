import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Building2, Filter, MoreHorizontal, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const scoreColor = (s: number) => s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-destructive";

const Clients = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    industry_type: "",
    entity_type: "",
    turnover: "",
    gst_registered: false,
    has_foreign_investment: false,
  });

  const fetchClients = async () => {
    if (!profile?.firm_id) return;
    const { data, error } = await supabase
      .from("clients")
      .select("*, compliance_tasks(status, risk_level)")
      .eq("firm_id", profile.firm_id)
      .order("created_at", { ascending: false });

    if (!error) {
      const enriched = (data || []).map(c => {
        const tasks = c.compliance_tasks || [];
        const completed = tasks.filter((t: any) => t.status === "completed").length;
        const overdue = tasks.filter((t: any) => t.status === "overdue").length;
        const score = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 100;
        return { ...c, taskCount: tasks.length, overdue, score };
      });
      setClients(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [profile?.firm_id]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.firm_id) return;
    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      ...form,
      firm_id: profile.firm_id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Client added" });
      setDialogOpen(false);
      setForm({ client_name: "", industry_type: "", entity_type: "", turnover: "", gst_registered: false, has_foreign_investment: false });
      fetchClients();
    }
    setSaving(false);
  };

  const filtered = clients.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your client portfolio and compliance status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 glow"><Plus className="w-4 h-4" /> Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Client Name</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Entity Type</Label>
                  <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Pvt Ltd", "LLP", "NBFC", "Listed", "Startup"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input value={form.industry_type} onChange={e => setForm(f => ({ ...f, industry_type: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Turnover</Label>
                <Input value={form.turnover} onChange={e => setForm(f => ({ ...f, turnover: e.target.value }))} placeholder="e.g. ₹45 Cr" />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.gst_registered} onCheckedChange={v => setForm(f => ({ ...f, gst_registered: v }))} />
                  <Label className="text-xs">GST Registered</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.has_foreign_investment} onCheckedChange={v => setForm(f => ({ ...f, has_foreign_investment: v }))} />
                  <Label className="text-xs">Foreign Investment</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Client
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-9 bg-muted/50 border-border/50 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No clients found. Add your first client to get started.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-hover p-5 flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold truncate">{c.client_name}</p>
                  {c.entity_type && <Badge variant="outline" className="text-[10px] px-1.5">{c.entity_type}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{c.industry_type || "—"} · Turnover: {c.turnover || "—"}</p>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Tasks</p>
                  <p className="text-sm font-bold">{c.taskCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className={`text-sm font-bold ${c.overdue > 0 ? "text-destructive" : "text-success"}`}>{c.overdue}</p>
                </div>
                <div className="w-24">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Health</span>
                    <span className={`text-xs font-bold ${scoreColor(c.score)}`}>{c.score}%</span>
                  </div>
                  <Progress value={c.score} className="h-1.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
