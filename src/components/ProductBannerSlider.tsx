import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/integrations/supabase/db-types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ProductBannerSliderProps {
  products: Product[];
  onOpenProduct: (product: Product) => void;
  onOrder: (product: Product) => void;
}

function productCover(product: Product): string | null {
  if (product.images?.length) return product.images[0];
  return product.image_url || null;
}

const ProductBannerSlider = ({ products, onOpenProduct, onOrder }: ProductBannerSliderProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || products.length < 2) return;
    const id = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4500);
    return () => window.clearInterval(id);
  }, [api, products.length]);

  if (!products.length) return null;

  return (
    <section className="w-full border-b bg-muted/20 py-3 sm:py-4">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 relative">
        <p className="text-xs text-muted-foreground mb-2 px-1">منتجات مميزة</p>
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: products.length > 4, direction: "rtl" }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 sm:-ml-3">
            {products.map((product) => {
              const cover = productCover(product);
              const outOfStock = (product.stock_quantity ?? 0) <= 0;
              return (
                <CarouselItem
                  key={product.id}
                  className="pl-2 sm:pl-3 basis-full sm:basis-1/2 md:basis-1/3 xl:basis-1/4"
                >
                  <article
                    className="relative overflow-hidden rounded-xl border bg-card shadow-sm cursor-pointer group h-full"
                    onClick={() => onOpenProduct(product)}
                  >
                    <div className="aspect-[4/3] bg-muted relative">
                      {cover ? (
                        <img
                          src={cover}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      {outOfStock && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-[10px]">
                          نفذت الكمية
                        </Badge>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-3 text-white space-y-1.5">
                        <h3 className="font-display font-bold text-sm sm:text-base line-clamp-1 drop-shadow">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-secondary">
                            {Number(product.price).toLocaleString()} ل.س
                          </span>
                          <Button
                            size="sm"
                            className="h-7 text-[11px] px-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            disabled={outOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrder(product);
                            }}
                          >
                            {outOfStock ? "غير متوفر" : "اطلب"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {products.length > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/85 z-10 hidden sm:flex"
                onClick={() => api?.scrollPrev()}
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/85 z-10 hidden sm:flex"
                onClick={() => api?.scrollNext()}
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {products.length <= 12 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {products.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`منتج ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === current ? "w-4 bg-secondary" : "w-1.5 bg-muted-foreground/30"
                      }`}
                      onClick={() => api?.scrollTo(i)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
};

export default ProductBannerSlider;
