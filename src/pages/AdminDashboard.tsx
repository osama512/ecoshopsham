import { Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, CreditCard } from "lucide-react";
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
  { title: "نظرة عامة", url: "/admin", icon: LayoutDashboard },
  { title: "التجار", url: "/admin/merchants", icon: Users },
  { title: "الباقات", url: "/admin/plans", icon: CreditCard },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <div className="px-4 py-4">
          <h1 className="text-lg font-display font-bold tracking-tight">
            {collapsed ? (
              <img src="/favicon.png?v=2" alt="ecoshopsham" className="h-7 w-7 rounded-md" />
            ) : (
              <span className="flex items-center gap-2">
                <img src="/favicon.png?v=2" alt="" className="h-7 w-7 rounded-md" />
                ecoshop<span className="text-secondary">sham</span>
                <span className="text-xs text-muted-foreground">إدارة</span>
              </span>
            )}
          </h1>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>الإدارة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
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

const AdminDashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4 bg-card/95 backdrop-blur-md">
            <SidebarTrigger className="ml-3" />
            <span className="text-sm font-medium text-muted-foreground">لوحة الإدارة</span>
          </header>
          <main className="flex-1 p-4 md:p-6 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
