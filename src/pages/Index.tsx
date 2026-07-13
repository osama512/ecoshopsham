import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, MessageCircle, BarChart3, Sparkles, ArrowLeft } from "lucide-react";

const features = [
  { icon: ShoppingBag, title: "متجر إلكتروني فوري", desc: "أنشئ متجرك وابدأ البيع خلال دقائق بدون خبرة تقنية." },
  { icon: MessageCircle, title: "طلبات عبر واتساب", desc: "نظام طلبات ذكي يربط زبائنك بك مباشرة عبر واتساب." },
  { icon: BarChart3, title: "إحصائيات ذكية", desc: "تابع مبيعاتك وأداء متجرك بلوحة تحكم احترافية." },
  { icon: Sparkles, title: "تسويق بالذكاء الاصطناعي", desc: "أدوات تسويق متقدمة وكوبونات خصم لزيادة مبيعاتك." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-display font-bold tracking-tight flex items-center gap-2">
          <img src="/favicon.png?v=2" alt="" className="h-7 w-7 rounded-md" />
          ecoshop<span className="text-secondary">sham</span>
        </h1>
        <div className="flex gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">تسجيل الدخول</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-semibold">
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 md:py-24 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-display font-extrabold leading-tight">
          أطلق متجرك الإلكتروني في <span className="text-secondary">سوريا</span> خلال دقائق
        </h2>
        <p className="text-muted-foreground mt-4 text-base md:text-lg max-w-xl mx-auto">
          منصة ecoshopsham تساعدك على إنشاء متجر إلكتروني احترافي، استقبال الطلبات عبر واتساب، وإدارة مبيعاتك بسهولة.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-bold text-base gap-2 px-8 shadow-lg shadow-secondary/25">
              ابدأ فترة التجربة المجانية
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-3">7 أيام تجربة مجانية · بدون بطاقة ائتمان</p>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-4xl mx-auto">
        <h3 className="text-2xl font-display font-bold text-center mb-8">لماذا ecoshopsham؟</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-secondary" />
              </div>
              <h4 className="font-semibold">{f.title}</h4>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <Card className="max-w-lg mx-auto p-8 bg-primary text-primary-foreground space-y-4">
          <h3 className="text-xl font-display font-bold">جاهز لبدء البيع؟</h3>
          <p className="text-sm opacity-80">انضم لمئات التجار السوريين الذين يثقون بـ ecoshopsham</p>
          <Link to="/signup">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-bold gap-2">
              سجّل الآن مجاناً
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t">
        © {new Date().getFullYear()} ecoshopsham — جميع الحقوق محفوظة
      </footer>
    </div>
  );
};

export default Index;
