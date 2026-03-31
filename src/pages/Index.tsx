import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import ProductsPage from "@/components/ProductsPage";
import OrdersPage from "@/components/OrdersPage";
import AIMarketerPage from "@/components/AIMarketerPage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-3">
        <h1 className="text-lg font-display font-bold tracking-tight">
          Syria<span className="text-secondary">Biz</span>
        </h1>
      </header>

      <main className="px-4 py-4 pb-24">
        {activeTab === "products" && <ProductsPage />}
        {activeTab === "orders" && <OrdersPage />}
        {activeTab === "ai" && <AIMarketerPage />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
