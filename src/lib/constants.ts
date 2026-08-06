import {
  BarChart3,
  LayoutDashboard,
  MessageSquareText,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  UserRound,
  WalletCards,
  Globe2,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { CowIcon } from "@/components/ui/cow-icon";

export const APP_NAME = "Yedirenk";

export const USER_ROLES = {
  ADMIN: "Yönetici",
  DONATION_STAFF: "Bağış Personeli",
  REPRESENTATIVE: "Temsilci",
  REPORT_VIEWER: "Rapor Kullanıcısı",
  POSTER_USER: "Afiş / Yazdırma Kullanıcısı",
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const NAV_ITEMS = [
  { label: "Ana Sayfa", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "DONATION_STAFF", "REPORT_VIEWER"] },
  { label: "Genel Bağış", href: "/bagislar/yeni", icon: WalletCards, roles: ["ADMIN", "DONATION_STAFF"] },
  { label: "Online Bağış", href: "/online-bagislar", icon: Globe2, roles: ["ADMIN", "DONATION_STAFF"] },
  { label: "Kurban", href: "/kurbanlar/bagis", icon: CowIcon, roles: ["ADMIN", "DONATION_STAFF"] },
  { label: "Bağışçılar", href: "/bagiscilar", icon: UserRound, roles: ["ADMIN", "DONATION_STAFF"] },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquareText, roles: ["ADMIN", "DONATION_STAFF"] },
  { label: "Raporlar", href: "/raporlar", icon: BarChart3, roles: ["ADMIN", "REPORT_VIEWER"] },
  { label: "Afişler", href: "/afisler/yatay", icon: PanelsTopLeft, roles: ["ADMIN", "POSTER_USER"] },
  { label: "Kullanıcılar", href: "/kullanicilar", icon: ShieldCheck, roles: ["ADMIN"] },
  { label: "Ayarlar", href: "/ayarlar", icon: Settings, roles: ["ADMIN"] },
] satisfies ReadonlyArray<{
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: UserRole[];
}>;

export const DONATION_TYPES = [
  "Kurban",
  "Zekât",
  "Kur’an",
  "Genel Bağış",
] as const;

export const SACRIFICE_KINDS = [
  { value: "VACIP", label: "Vacip" },
  { value: "ADAK", label: "Adak" },
  { value: "AKIKA", label: "Akika" },
  { value: "NAFILE", label: "Nafile" },
] as const;

export type SacrificeKind = (typeof SACRIFICE_KINDS)[number]["value"];

export const PAYMENT_METHODS = [
  { value: "SAME_PAYMENT", label: "Ayni Ödeme" },
  { value: "BANK", label: "Banka" },
  { value: "CHECK", label: "Çek" },
  { value: "PARTIAL_PAYMENT", label: "Kısmi Ödeme" },
  { value: "CASH", label: "Nakit" },
  { value: "ONLINE_DONATION", label: "Online Bağış" },
  { value: "PAYMENT_PENDING", label: "Ödeme Bekliyor" },
  { value: "POS_DEVICE", label: "Pos Cihazı" },
] as const;
