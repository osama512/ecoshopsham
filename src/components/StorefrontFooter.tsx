import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Send, MessageCircle } from "lucide-react";
import type { StoreFooter, StoreSocialPlatform } from "@/lib/storeTheme";
import { hasStoreFooterContent } from "@/lib/storeTheme";
import { isCustomDomainHost } from "@/lib/customDomain";

interface StorefrontFooterProps {
  storeName: string;
  storeKey: string;
  footer: StoreFooter;
  logoUrl?: string | null;
}

function socialHref(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("wa.me/") || url.startsWith("t.me/")) return `https://${url}`;
  return `https://${url.replace(/^\/+/, "")}`;
}

function SocialIcon({ platform }: { platform: StoreSocialPlatform }) {
  const cls = "h-4 w-4";
  switch (platform) {
    case "facebook":
      return <Facebook className={cls} />;
    case "instagram":
      return <Instagram className={cls} />;
    case "youtube":
      return <Youtube className={cls} />;
    case "telegram":
      return <Send className={cls} />;
    case "whatsapp":
      return <MessageCircle className={cls} />;
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.8a8.2 8.2 0 0 0 4.76 1.52V6.88a4.85 4.85 0 0 1-1-.19z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.227-8.451L1.99 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return <ShareGlyph />;
  }
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

export function storeInfoPagePath(storeKey: string, pageSlug: string): string {
  if (isCustomDomainHost()) return `/info/${encodeURIComponent(pageSlug)}`;
  return `/s/${storeKey}/info/${encodeURIComponent(pageSlug)}`;
}

const StorefrontFooter = ({ storeName, storeKey, footer, logoUrl }: StorefrontFooterProps) => {
  const showMerchant = hasStoreFooterContent(footer);

  return (
    <footer className="border-t mt-8 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {showMerchant && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-display font-bold">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-primary-foreground/30" />
                ) : null}
                <span>{storeName}</span>
              </div>
              {footer.about ? (
                <p className="text-primary-foreground/85 text-xs leading-relaxed whitespace-pre-line">
                  {footer.about}
                </p>
              ) : (
                <p className="text-primary-foreground/70 text-xs">تسوق بأمان وسهولة.</p>
              )}
            </div>

            {footer.pages.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-primary-foreground/70">
                  صفحات مهمة
                </h3>
                <ul className="space-y-1.5">
                  {footer.pages.map((page) => (
                    <li key={page.id}>
                      <Link
                        to={storeInfoPagePath(storeKey, page.slug)}
                        className="text-sm hover:underline underline-offset-4"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {footer.socials.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-primary-foreground/70">
                  تواصل معنا
                </h3>
                <div className="flex flex-wrap gap-2">
                  {footer.socials.map((social) => (
                    <a
                      key={social.id}
                      href={socialHref(social.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors"
                      title={social.label}
                    >
                      <SocialIcon platform={social.platform} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-primary-foreground/65 pt-2 border-t border-primary-foreground/15">
          مدعوم من ecoshop<span className="font-semibold text-secondary">sham</span>
        </p>
      </div>
    </footer>
  );
};

export default StorefrontFooter;
