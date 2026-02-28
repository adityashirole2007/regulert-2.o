import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const sources = ["All", "RBI", "SEBI", "MCA", "GST"];

const riskColor = (r: string) => {
  switch (r) {
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    case "low": return "bg-success/10 text-success border-success/20";
    default: return "";
  }
};

const sourceColor = (s: string) => {
  switch (s) {
    case "RBI": return "bg-info/10 text-info border-info/30";
    case "SEBI": return "bg-primary/10 text-primary border-primary/30";
    case "MCA": return "bg-warning/10 text-warning border-warning/30";
    case "GST": return "bg-success/10 text-success border-success/30";
    default: return "";
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case "scraped": return "bg-muted text-muted-foreground";
    case "processing": return "bg-info/10 text-info";
    case "processed": return "bg-success/10 text-success";
    case "failed": return "bg-destructive/10 text-destructive";
    default: return "";
  }
};

const RegulatoryFeed = () => {
  const [activeSource, setActiveSource] = useState("All");
  const [search, setSearch] = useState("");
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchCirculars = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const minDate = sevenDaysAgo.toISOString().slice(0, 10);

    let query = supabase
      .from("circulars")
      .select("*, circular_impact(*)")
      .gte("published_date", minDate)
      .order("published_date", { ascending: false })
      .limit(50);

    if (activeSource !== "All") {
      query = query.eq("source", activeSource);
    }

    const { data, error } = await query;
    if (!error) setCirculars(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCirculars(); }, [activeSource]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-pipeline");
      if (error) throw error;

      // Show per-source results
      const scrapeData = data?.scrape;
      if (scrapeData?.sources) {
        const s = scrapeData.sources;
        const parts = Object.entries(s).map(
          ([key, val]: [string, any]) => `${key.toUpperCase()}: ${val.count} (${val.status})`
        );
        toast({
          title: "Refresh complete",
          description: parts.join(" · "),
        });
      } else {
        toast({
          title: "Refresh complete",
          description: `Scraped ${scrapeData?.scraped || 0} new circulars`,
        });
      }

      await fetchCirculars();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const getRisk = (c: any) => {
    const impacts = c.circular_impact || [];
    if (impacts.some((i: any) => i.risk_level === "high")) return "high";
    if (impacts.some((i: any) => i.risk_level === "medium")) return "medium";
    return "low";
  };

  const filtered = circulars.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regulatory Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-summarized circulars from the last 7 days</p>
        </div>
        <Button className="gap-2 glow" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {refreshing ? "Running..." : "Refresh"}
        </Button>
      </motion.div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search circulars..." className="pl-9 bg-muted/50 border-border/50 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          {sources.map(s => (
            <Button key={s} variant={activeSource === s ? "default" : "outline"} size="sm" onClick={() => setActiveSource(s)} className="text-xs h-8">{s}</Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No circulars found. Click "Refresh" to scrape latest regulatory data.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((c, i) => {
            const risk = getRisk(c);
            const impact = c.circular_impact?.[0];
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-hover p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] font-bold ${sourceColor(c.source)}`}>{c.source}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${riskColor(risk)}`}>{risk} Risk</Badge>
                      <Badge variant="outline" className={`text-[10px] ${statusBadge(c.status)}`}>{c.status}</Badge>
                      <span className="text-xs text-muted-foreground">{c.published_date || new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">{c.title}</h3>
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="flex-shrink-0"><ExternalLink className="w-4 h-4" /></Button>
                    </a>
                  )}
                </div>
                {c.summary && (
                  <div className="bg-muted/50 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">AI Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.summary}</p>
                  </div>
                )}
                {impact && (
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    {c.effective_date && <span>Effective: <strong className="text-foreground">{c.effective_date}</strong></span>}
                    {impact.compliance_action && <span>Action: <strong className="text-foreground">{impact.compliance_action}</strong></span>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegulatoryFeed;
