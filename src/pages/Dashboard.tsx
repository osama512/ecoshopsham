import { Outlet, useLocation, Link } from "react-router-dom";
import { Package, ShoppingCart, Sparkles, Settings, LogOut, Shield, BarChart3, Megaphone } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, role } = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin";

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <div className="px-4 py-4">
          <h1 className="text-lg font-display font-bold tracking-tight">
            {collapsed ? "S" : <>Syria<span className="text-secondary">Biz</span></>}
          </h1>
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
        {isAdmin && (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" asChild>
            <Link to="/admin">
              <Shield className="h-4 w-4" />
              {!collapsed && "لوحة الإدارة"}
            </Link>
          </Button>
        )}
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
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4 bg-card/95 backdrop-blur-md">
            <SidebarTrigger className="ml-3" />
            <span className="text-sm font-medium text-muted-foreground">لوحة التاجر</span>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-4xl">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
