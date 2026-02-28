import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Key, Building2, Users, CreditCard, Save, Shield, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || "");
      // Fetch firm
      if (profile.firm_id) {
        supabase.from("firms").select("firm_name").eq("id", profile.firm_id).single().then(({ data }) => {
          if (data) setFirmName(data.firm_name);
        });
        // Fetch team members
        supabase.from("profiles").select("*").eq("firm_id", profile.firm_id).then(({ data }) => {
          setTeamMembers(data || []);
        });
      }
    }
  }, [profile]);

  const handleSaveFirm = async () => {
    if (!profile?.firm_id) return;
    setSaving(true);
    const { error } = await supabase
      .from("firms")
      .update({ firm_name: firmName })
      .eq("id", profile.firm_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your firm and integrations</p>
      </motion.div>

      {/* AI Configuration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI Configuration</h2>
            <p className="text-xs text-muted-foreground">Powered by Lovable AI – no API key required</p>
          </div>
          <Badge className="ml-auto text-[10px]">Active</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          RegIntel AI uses built-in intelligence to summarize circulars and extract compliance impact. No external API keys needed.
        </p>
      </motion.div>

      {/* Firm Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Firm Profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Firm Name</Label>
            <Input value={firmName} onChange={e => setFirmName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={email} disabled className="h-9 text-sm" />
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={handleSaveFirm} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
        </Button>
      </motion.div>

      {/* Team Members */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Team Members</h2>
          </div>
        </div>
        <div className="space-y-2">
          {teamMembers.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{m.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button variant="outline" className="gap-2 text-destructive" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
