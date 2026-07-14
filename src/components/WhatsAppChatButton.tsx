import { formatSyrianWhatsApp } from "@/lib/phone";

interface WhatsAppChatButtonProps {
  whatsapp: string;
  storeName?: string;
}

/** Floating button: opens a blank chat with the merchant (not an order). */
const WhatsAppChatButton = ({ whatsapp, storeName }: WhatsAppChatButtonProps) => {
  const num = formatSyrianWhatsApp(whatsapp);
  if (!num) return null;

  const greeting = storeName?.trim()
    ? encodeURIComponent(`مرحباً، أود الاستفسار من متجر ${storeName.trim()}`)
    : encodeURIComponent("مرحباً، أود الاستفسار");

  return (
    <a
      href={`https://wa.me/${num}?text=${greeting}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="محادثة واتساب مع التاجر"
      className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.139-1.172-.58-1.172-.58-.78-.314-.445-.154-.612-.272-.17-.118-.347-.118-.52.04-.172.158-.67.78-.82.94-.15.158-.3.177-.553.06-.78-.314-1.37-.565-2.16-1.22-.8-.696-1.34-1.556-1.52-1.818-.158-.26-.017-.4.12-.528.118-.115.26-.3.39-.45.13-.148.172-.255.26-.425.087-.17.043-.318-.022-.445-.065-.128-.58-1.397-.795-1.914-.21-.502-.423-.434-.58-.442l-.494-.03c-.172 0-.45.065-.686.318-.237.252-.9.88-.9 2.146s.922 2.21 1.05 2.37c.13.158 1.81 2.765 4.385 3.877 1.76.76 2.12.607 2.5.57.382-.037 1.172-.48 1.338-.94.165-.462.165-.858.115-.94-.05-.08-.19-.13-.4-.228z" />
        <path d="M12.04 2C6.58 2 2.15 6.43 2.15 11.89c0 1.94.57 3.73 1.55 5.26L2 22l4.98-1.3a9.86 9.86 0 0 0 5.06 1.37h.01c5.46 0 9.89-4.43 9.89-9.89C21.94 6.43 17.5 2 12.04 2zm0 18.08h-.01a8.17 8.17 0 0 1-4.16-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.34c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.18 8.2z" />
      </svg>
    </a>
  );
};

export default WhatsAppChatButton;
