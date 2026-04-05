import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const PLANS = [
  {
    name: "Basic (مجانية)",
    key: "free",
    color: "secondary",
    features: [
      { label: "حتى 10 منتجات", included: true },
      { label: "طلبات غير محدودة", included: true },
      { label: "واجهة متجر عامة", included: true },
      { label: "إحصائيات", included: false },
      { label: "كوبونات وتسويق", included: false },
      { label: "دومين مخصص", included: false },
      { label: "دعم مميز", included: false },
    ],
  },
  {
    name: "Pro",
    key: "pro",
    color: "primary",
    features: [
      { label: "منتجات غير محدودة", included: true },
      { label: "طلبات غير محدودة", included: true },
      { label: "واجهة متجر عامة", included: true },
      { label: "إحصائيات متقدمة", included: true },
      { label: "كوبونات وتسويق", included: true },
      { label: "دومين مخصص", included: false },
      { label: "دعم مميز", included: false },
    ],
  },
  {
    name: "Enterprise",
    key: "enterprise",
    color: "success",
    features: [
      { label: "منتجات غير محدودة", included: true },
      { label: "طلبات غير محدودة", included: true },
      { label: "واجهة متجر عامة", included: true },
      { label: "إحصائيات متقدمة", included: true },
      { label: "كوبونات وتسويق", included: true },
      { label: "دومين مخصص", included: true },
      { label: "دعم أولوية", included: true },
    ],
  },
];

const AdminPlans = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">إدارة الباقات</h1>
        <p className="text-sm text-muted-foreground">الباقات المتاحة للتجار — يمكنك تعيينها من صفحة التجار</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card key={plan.key} className="p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold">{plan.name}</h2>
              <Badge variant={plan.key === "free" ? "secondary" : "default"} className="text-xs">
                {plan.key}
              </Badge>
            </div>
            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm">
                  {f.included ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminPlans;
