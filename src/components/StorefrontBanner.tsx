import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorefrontBannerProps {
  banners: string[];
  storeName: string;
}

const StorefrontBanner = ({ banners, storeName }: StorefrontBannerProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [banners.join("|")]);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="relative w-full aspect-[2.4/1] max-h-56 sm:max-h-64 overflow-hidden bg-muted">
      <img
        src={banners[current]}
        alt={`${storeName} — بانر ${current + 1}`}
        className="w-full h-full object-cover"
      />
      {banners.length > 1 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/70 hover:bg-background/90"
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            aria-label="التالي"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/70 hover:bg-background/90"
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            aria-label="السابق"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`شريحة ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-secondary" : "w-1.5 bg-background/70"
                }`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StorefrontBanner;
