import { Outlet, useLocation, Link } from "react-router-dom";
import { Package, ShoppingCart, Sparkles, Settings, LogOut, BarChart3, Megaphone, Link2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "المنتجات", url: "/dashboard/products", icon: Package },
  { title: "الطلبات", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "المسوّق الذكي", url: "/dashboard/ai", icon: Sparkles },
  { title: "إحصائيات", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "تسويق", url: "/dashboard/marketing", icon: Megaphone },
  { title: "الإعدادات", url: "/dashboard/settings", icon: Settings },
];

function CopyStoreLinkButton({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("profiles")
        .select("store_slug")
        .eq("id", user.id)
        .maybeSingle();
      const slug = (data as any)?.store_slug;
      const storePath = slug || user.id.replace(/-/g, "").slice(0, 6);
      const link = `${window.location.origin}/s/${storePath}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("تم نسخ الرابط بنجاح! 🔗");
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size="sm"
      className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {!collapsed && (copied ? "تم النسخ!" : "نسخ رابط المتجر")}
    </Button>
  );
}

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <div className="px-4 py-4 space-y-3">
          <h1 className="text-lg font-display font-bold tracking-tight">
            {collapsed ? "S" : <>Syria<span className="text-secondary">Biz</span></>}
          </h1>
          <CopyStoreLinkButton collapsed={collapsed} />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="ml-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-3 space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && "تسجيل الخروج"}
        </Button>
      </div>
    </Sidebar>
  );
}

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 bg-card/95 backdrop-blur-md">
            <SidebarTrigger className="ml-3" />
            <span className="text-sm font-medium text-muted-foreground">لوحة التاجر</span>
          </header>
          <main className="flex-1 w-full min-w-0 p-4 md:p-6">
            <TrialBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
