import { useState } from "react";
import { Package, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImageCarouselProps {
  images: string[];
  imageUrl: string | null;
  alt: string;
  className?: string;
}

const ProductImageCarousel = ({ images, imageUrl, alt, className = "" }: ProductImageCarouselProps) => {
  const allImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
  const [current, setCurrent] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <Package className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={`relative bg-muted overflow-hidden group ${className}`}>
      <img
        src={allImages[current]}
        alt={`${alt} ${current + 1}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {allImages.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % allImages.length); }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + allImages.length) % allImages.length); }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === current ? "bg-secondary" : "bg-background/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductImageCarousel;
