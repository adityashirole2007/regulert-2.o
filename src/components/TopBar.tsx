import { useEffect, useState } from "react";
import { Bell, Search, Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  compact?: boolean;
}

export function TopBar({ compact }: TopBarProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.read).length);
      });
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const [firmName, setFirmName] = useState("Loading...");
  useEffect(() => {
    if (profile?.firm_id) {
      supabase.from("firms").select("firm_name").eq("id", profile.firm_id).single().then(({ data }) => {
        if (data) setFirmName(data.firm_name);
      });
    }
  }, [profile?.firm_id]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold">Notifications</p>
            </div>
            <div className="max-h-64 overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`} onClick={() => markRead(n.id)}>
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search circulars, clients, tasks..." className="pl-9 bg-muted/50 border-border/50 h-9 text-sm" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold">Notifications</p>
            </div>
            <div className="max-h-64 overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`} onClick={() => markRead(n.id)}>
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{firmName}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role || "User"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
