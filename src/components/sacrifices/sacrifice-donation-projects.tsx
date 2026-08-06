"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { CowIcon } from "@/components/ui/cow-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHODS, type SacrificeKind } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { SacrificeDonationForm } from "@/components/sacrifices/sacrifice-donation-form";

type Share = {
  id: string;
  donationId: string | null;
  shareNo: number;
  status: "EMPTY" | "PENDING" | "FILLED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod: string | null;
  amount: number;
  description: string;
  quantity: number;
  receiptNo: string;
  createdAt: string | null;
  donor: {
    firstName: string;
    lastName: string;
    phone: string;
    phoneCountry: string;
    originCountry: string;
    city: string;
    district: string;
  } | null;
};

type Sacrifice = {
  id: string;
  number: number;
  name: string;
  year: string;
  department: string;
  donationType: string;
  group: string;
  country: string;
  partner: string;
  region: string;
  currency: string;
  currencyCode: string;
  kind: SacrificeKind;
  sharePrice: number;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  shares: Share[];
};

type ProjectRow = {
  id: string;
  donationId: string;
  projectName: string;
  projectId: string;
  projectNo: number;
  shareNo: number;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountry: string;
  originCountry: string;
  city: string;
  district: string;
  date: string;
  projectYear: string;
  department: string;
  kind: SacrificeKind;
  donationType: string;
  group: string;
  country: string;
  partner: string;
  region: string;
  currency: string;
  currencyCode: string;
  paymentMethod: string;
  amount: number;
  description: string;
  quantity: number;
  receiptNo: string;
  status: Share["status"];
};

type SortKey = keyof Pick<ProjectRow,
  "projectName" | "projectNo" | "shareNo" | "firstName" | "lastName" | "phone" |
  "city" | "district" | "date" | "donationType" | "group" | "paymentMethod" |
  "amount" | "quantity" | "receiptNo" | "currency" | "country" | "partner" | "region" | "status"
>;

type SortDirection = "asc" | "desc";
type DefinitionOption = { id: string; code: string; name: string; parentId?: string | null };

const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function paymentLabel(code: string) {
  return PAYMENT_METHODS.find((item) => item.value === code)?.label ?? (code || "—");
}

function printableDate(value: string) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value)) : "—";
}

function openPrintDocument(title: string, body: string, landscape = false) {
  const pageWidth = landscape ? "297mm" : "210mm";
  const pageHeight = landscape ? "210mm" : "297mm";
  const printWindow = window.open("", `yedirenk-print-${Date.now()}`, "width=1100,height=850");
  if (!printWindow) {
    window.alert("Yazdırma penceresi açılamadı. Tarayıcınızda açılır pencerelere izin verin.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title>
<style>
@page{size:${pageWidth} ${pageHeight};margin:0}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#e8eeed;color:#12303c;font-family:Arial,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.toolbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#092c3b;color:#fff;box-shadow:0 4px 18px #092c3b33}.toolbar strong{font-size:14px}.toolbar div{display:flex;gap:8px}
.toolbar button{border:0;border-radius:9px;padding:10px 16px;font-weight:700;cursor:pointer}.toolbar .print{background:#02b3aa;color:#fff}.toolbar .close{background:#ffffff18;color:#fff;border:1px solid #ffffff38}
.sheet{position:relative;width:${pageWidth};height:${pageHeight};min-height:0;max-height:${pageHeight};margin:20px auto;background:#fff;overflow:hidden;box-shadow:0 18px 55px #092c3b25;break-inside:avoid;page-break-inside:avoid}
.sheet:before{content:"";position:absolute;inset:0 0 auto;height:8px;background:linear-gradient(90deg,#02b3aa,#02b3aa 55%,#f59e0b)}
.content{padding:${landscape ? "14mm" : "15mm"}}
.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce7e5;padding:2mm 0 7mm}.brandmark{display:flex;align-items:center;gap:12px}.logo{width:52px;height:52px;object-fit:contain}.brand h1{margin:0;font-size:24px;letter-spacing:-.6px}.brand p{margin:3px 0 0;color:#71838c;font-size:10px;letter-spacing:2px;font-weight:700}.docmeta{text-align:right}.docmeta strong{display:block;color:#027f79;font-size:12px;letter-spacing:1px}.docmeta span{display:block;margin-top:5px;color:#71838c;font-size:11px}
.title{padding:9mm 0 6mm}.title small{color:#02b3aa;font-weight:800;letter-spacing:1.8px}.title h2{margin:5px 0 0;font-size:27px;letter-spacing:-.7px}.title p{margin:6px 0 0;color:#6b7d86;font-size:12px}
.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:5mm;margin-bottom:6mm}.hero-main{padding:6mm;border-radius:14px;background:linear-gradient(135deg,#092f3f,#0c5060);color:#fff}.hero-main label,.amount label{display:block;font-size:9px;font-weight:800;letter-spacing:1.5px;opacity:.7}.hero-main strong{display:block;margin-top:7px;font-size:21px}.hero-main span{display:block;margin-top:6px;color:#c9e4e5;font-size:11px}.amount{display:flex;flex-direction:column;justify-content:center;padding:6mm;border:1px solid #bfeadd;border-radius:14px;background:#ecfdf7}.amount strong{display:block;margin-top:7px;color:#067b5b;font-size:25px}.amount span{margin-top:5px;color:#648078;font-size:10px}
.sections{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.section{border:1px solid #dce7e5;border-radius:13px;overflow:hidden}.section h3{margin:0;padding:4mm 5mm;background:#f1f8f6;color:#0a6e59;font-size:11px;letter-spacing:.8px;text-transform:uppercase}.rows{padding:2mm 5mm 4mm}.row{display:grid;grid-template-columns:38% 62%;gap:8px;padding:3mm 0;border-bottom:1px dashed #dce7e5;font-size:11px}.row:last-child{border:0}.row span{color:#76878e}.row strong{overflow-wrap:anywhere;text-align:right;color:#183845}
.note{margin-top:5mm;padding:4mm 5mm;border-left:4px solid #f5a623;border-radius:0 10px 10px 0;background:#fff8e9;color:#6e5a31;font-size:10px;line-height:1.55}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:18mm;margin-top:12mm}.signature{text-align:center;color:#60747c;font-size:10px}.signature:before{content:"";display:block;margin-bottom:3mm;border-top:1px solid #789098}.footer{position:absolute;right:15mm;bottom:10mm;left:15mm;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #dce7e5;padding-top:4mm;color:#788b92;font-size:9px}.footer strong{color:#027f79}
.report-title{display:flex;justify-content:space-between;align-items:end;padding:8mm 0 5mm}.report-title h2{margin:0;font-size:23px}.report-title p{margin:5px 0 0;color:#71838c;font-size:11px}.badge{border-radius:10px;background:#ecfdf7;padding:9px 13px;color:#027f79;font-size:11px;font-weight:800}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:8px}thead th{padding:9px 7px;background:#02b3aa;color:#fff;text-align:left;white-space:nowrap}thead th:first-child{border-radius:9px 0 0 0}thead th:last-child{border-radius:0 9px 0 0}tbody td{padding:8px 7px;border-bottom:1px solid #dfe8e7;vertical-align:top}tbody tr:nth-child(even){background:#f5faf9}.money{font-weight:800;color:#027f79}.report-footer{margin-top:6mm;display:flex;justify-content:space-between;color:#74868d;font-size:9px}
.report-compact .content{padding:10mm}.report-compact .brand{padding-bottom:4mm}.report-compact .report-title{padding:4mm 0 3mm}.report-compact table{font-size:7px}.report-compact thead th{padding:6px 5px}.report-compact tbody td{padding:5px}
.report-ultra-compact .content{padding:7mm}.report-ultra-compact .brand{padding-bottom:2mm}.report-ultra-compact .logo{width:38px;height:38px;font-size:19px}.report-ultra-compact .brand h1{font-size:18px}.report-ultra-compact .report-title{padding:2.5mm 0 2mm}.report-ultra-compact .report-title h2{font-size:16px}.report-ultra-compact .report-title p{display:none}.report-ultra-compact table{font-size:5.5px}.report-ultra-compact thead th{padding:4px 3px}.report-ultra-compact tbody td{padding:3px}.report-ultra-compact .report-footer{margin-top:2mm;font-size:7px}
@media print{html,body{width:${pageWidth};height:${pageHeight};min-height:0;max-height:${pageHeight};overflow:hidden;background:#fff}.toolbar{display:none!important}.sheet{width:${pageWidth};height:${pageHeight};min-height:0;max-height:${pageHeight};margin:0!important;overflow:hidden;box-shadow:none;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid}}
</style></head><body>
<div class="toolbar"><strong>Yedirenk Derneği · Yazdırma Önizlemesi</strong><div><button class="close" onclick="window.close()">Kapat</button><button class="print" onclick="window.print()">Yazdır / PDF Kaydet</button></div></div>
${body}
<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));<\/script>
</body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function printDonationReceipt(row: ProjectRow) {
  const receipt = row.receiptNo || `BGS-${row.projectNo}-${row.shareNo}`;
  openPrintDocument(`Bağış Makbuzu · ${receipt}`, `
<main class="sheet"><div class="content">
  <header class="brand"><div class="brandmark"><img class="logo" src="/yedirenk-logo.png" alt="Yedirenk Derneği"><div><h1>Yedirenk</h1><p>BAĞIŞ YÖNETİMİ</p></div></div><div class="docmeta"><strong>BAĞIŞ KAYIT BELGESİ</strong><span>Belge No: ${escapeHtml(receipt)}</span></div></header>
  <section class="title"><small>TEŞEKKÜR EDERİZ</small><h2>Kurban Bağışı Makbuzu</h2><p>Bağışınız güvenle kayıt altına alınmıştır. Bu belge elektronik sistem üzerinden oluşturulmuştur.</p></section>
  <section class="hero"><div class="hero-main"><label>BAĞIŞÇI</label><strong>${escapeHtml(`${row.firstName} ${row.lastName}`)}</strong><span>${escapeHtml(row.phone)} · ${escapeHtml([row.city, row.district].filter(Boolean).join(" / ") || "Konum bilgisi belirtilmedi")}</span></div><div class="amount"><label>BAĞIŞ TUTARI</label><strong>${escapeHtml(formatCurrency(row.amount))}</strong><span>${escapeHtml(paymentLabel(row.paymentMethod))}</span></div></section>
  <div class="sections">
    <section class="section"><h3>Proje Bilgileri</h3><div class="rows">
      <div class="row"><span>Proje</span><strong>${escapeHtml(row.projectName)}</strong></div>
      <div class="row"><span>Proje / Hisse No</span><strong>${escapeHtml(row.projectNo)} / ${escapeHtml(row.shareNo)}. hisse</strong></div>
      <div class="row"><span>Bağış grubu</span><strong>${escapeHtml(row.group)}</strong></div>
      <div class="row"><span>Giden ülke</span><strong>${escapeHtml(row.country || "—")}</strong></div>
      <div class="row"><span>Partner / Bölge</span><strong>${escapeHtml([row.partner, row.region].filter(Boolean).join(" / ") || "—")}</strong></div>
    </div></section>
    <section class="section"><h3>Ödeme ve Kayıt Bilgileri</h3><div class="rows">
      <div class="row"><span>Makbuz No</span><strong>${escapeHtml(receipt)}</strong></div>
      <div class="row"><span>Kayıt tarihi</span><strong>${escapeHtml(printableDate(row.date))}</strong></div>
      <div class="row"><span>Ödeme şekli</span><strong>${escapeHtml(paymentLabel(row.paymentMethod))}</strong></div>
      <div class="row"><span>Adet / Para birimi</span><strong>${escapeHtml(row.quantity)} / ${escapeHtml(row.currency)}</strong></div>
      <div class="row"><span>Durum</span><strong>${row.status === "FILLED" ? "Tamamlandı" : "Bekliyor"}</strong></div>
    </div></section>
  </div>
  ${row.description ? `<div class="note"><strong>Açıklama:</strong> ${escapeHtml(row.description)}</div>` : ""}
  <div class="signatures"><div class="signature">Bağışı Teslim Eden</div><div class="signature">Yetkili / Kaşe</div></div>
  <footer class="footer"><span>Bu belge Yedirenk Bağış Yönetim Sistemi tarafından oluşturulmuştur.</span><strong>Yedirenk Derneği · iyiliğe vesile</strong></footer>
</div></main>`);
}

function printDonationList(rows: ProjectRow[]) {
  const densityClass = rows.length > 35 ? "report-ultra-compact" : rows.length > 22 ? "report-compact" : "";
  const bodyRows = rows.map((row) => `<tr>
    <td>${escapeHtml(row.projectNo)}</td><td>${escapeHtml(row.projectName)}</td><td>${escapeHtml(row.shareNo)}</td>
    <td><strong>${escapeHtml(`${row.firstName} ${row.lastName}`)}</strong><br>${escapeHtml(row.phone)}</td>
    <td>${escapeHtml(row.country || "—")}<br>${escapeHtml(row.partner || "—")}</td>
    <td>${escapeHtml(row.group)}</td><td>${escapeHtml(paymentLabel(row.paymentMethod))}</td>
    <td class="money">${escapeHtml(formatCurrency(row.amount))}</td><td>${escapeHtml(row.receiptNo || "—")}</td><td>${escapeHtml(printableDate(row.date))}</td>
  </tr>`).join("");
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  openPrintDocument("Kurban Bağışları Raporu", `<main class="sheet ${densityClass}"><div class="content">
    <header class="brand"><div class="brandmark"><img class="logo" src="/yedirenk-logo.png" alt="Yedirenk Derneği"><div><h1>Yedirenk</h1><p>BAĞIŞ YÖNETİMİ</p></div></div><div class="docmeta"><strong>KURBAN BAĞIŞLARI</strong><span>${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}</span></div></header>
    <section class="report-title"><div><h2>Proje ve Bağışçı Listesi</h2><p>Uygulanan filtrelere göre hazırlanan ayrıntılı kurban bağış raporu</p></div><div class="badge">${rows.length} kayıt · ${escapeHtml(formatCurrency(total))}</div></section>
    <table><thead><tr><th>Proje No</th><th>Proje Adı</th><th>Hisse</th><th>Bağışçı</th><th>Ülke / Partner</th><th>Grup</th><th>Ödeme</th><th>Tutar</th><th>Makbuz</th><th>Tarih</th></tr></thead><tbody>${bodyRows}</tbody></table>
    <div class="report-footer"><span>Yedirenk Derneği Bağış Yönetimi · Kurumsal Rapor</span><strong>Toplam: ${escapeHtml(formatCurrency(total))}</strong></div>
  </div></main>`, true);
}

export function SacrificeDonationProjects() {
  const [sacrifices, setSacrifices] = useState<Sacrifice[]>([]);
  const [destinationCountries, setDestinationCountries] = useState<DefinitionOption[]>([]);
  const [departments, setDepartments] = useState<DefinitionOption[]>([]);
  const [donationGroups, setDonationGroups] = useState<DefinitionOption[]>([]);
  const [partners, setPartners] = useState<DefinitionOption[]>([]);
  const [currencies, setCurrencies] = useState<DefinitionOption[]>([]);
  const [originCountries, setOriginCountries] = useState<DefinitionOption[]>([]);
  const [originCities, setOriginCities] = useState<DefinitionOption[]>([]);
  const [destinationRegions, setDestinationRegions] = useState<DefinitionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [department, setDepartment] = useState("");
  const [group, setGroup] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [country, setCountry] = useState("");
  const [partner, setPartner] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("");
  const [payment, setPayment] = useState("");
  const [currency, setCurrency] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "projectNo",
    direction: "asc",
  });
  const [donationFormOpen, setDonationFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ProjectRow | null>(null);
  const [applied, setApplied] = useState({ department: "", group: "", city: "", district: "", country: "", partner: "", destinationRegion: "", payment: "", currency: "", year: "", month: "" });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("yeni") === "1") setDonationFormOpen(true);
  }, []);

  useEffect(() => {
    if (!donationFormOpen && !editingRow) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDonationFormOpen(false);
        setEditingRow(null);
      }
    }
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [donationFormOpen, editingRow]);

  const loadSacrifices = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/sacrifices", { cache: "no-store" });
      const data = (await response.json()) as {
        sacrifices?: Sacrifice[];
        destinationCountries?: DefinitionOption[];
        departments?: DefinitionOption[];
        donationGroups?: DefinitionOption[];
        partners?: DefinitionOption[];
        currencies?: DefinitionOption[];
        originCountries?: DefinitionOption[];
        originCities?: DefinitionOption[];
        destinationRegions?: DefinitionOption[];
        message?: string;
      };
      if (!response.ok) throw new Error(data.message);
      setSacrifices(data.sacrifices ?? []);
      setDestinationCountries(data.destinationCountries ?? []);
      setDepartments(data.departments ?? []);
      setDonationGroups(data.donationGroups ?? []);
      setPartners(data.partners ?? []);
      setCurrencies(data.currencies ?? []);
      setOriginCountries(data.originCountries ?? []);
      setOriginCities(data.originCities ?? []);
      setDestinationRegions(data.destinationRegions ?? []);
    } catch {
      setError("Kurban proje bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSacrifices(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSacrifices]);

  const selectedOriginCountryId = originCountries.find((item) => item.name === city)?.id ?? "";
  const districts = selectedOriginCountryId ? originCities.filter((item) => item.parentId === selectedOriginCountryId) : originCities;
  const selectedCountryId = destinationCountries.find((item) => item.name === country)?.id ?? "";
  const countryPartners = selectedCountryId ? partners.filter((item) => item.parentId === selectedCountryId) : [];
  const selectedPartnerId = partners.find((item) => item.name === partner)?.id ?? "";
  const countryRegions = selectedCountryId ? destinationRegions.filter((item) => item.parentId === selectedCountryId || item.parentId === selectedPartnerId) : [];
  const rows = useMemo<ProjectRow[]>(
    () =>
      sacrifices.flatMap((sacrifice) =>
        sacrifice.shares
          .filter((share) => share.donor)
          .map((share) => ({
            id: share.id,
            donationId: share.donationId ?? "",
            projectName: sacrifice.name,
            projectId: sacrifice.id,
            projectNo: sacrifice.number,
            shareNo: share.shareNo,
            firstName: share.donor?.firstName ?? "",
            lastName: share.donor?.lastName ?? "",
            phone: share.donor?.phone ?? "",
            phoneCountry: share.donor?.phoneCountry ?? "TR",
            originCountry: share.donor?.originCountry ?? "",
            city: share.donor?.city ?? "",
            district: share.donor?.district ?? "",
            date: share.createdAt ?? "",
            projectYear: sacrifice.year,
            department: sacrifice.department,
            kind: sacrifice.kind,
            donationType: sacrifice.donationType,
            group: sacrifice.group,
            country: sacrifice.country,
            partner: sacrifice.partner,
            region: sacrifice.region,
            currency: sacrifice.currency,
            currencyCode: sacrifice.currencyCode,
            paymentMethod: share.paymentMethod ?? "",
            amount: share.amount,
            description: share.description,
            quantity: share.quantity,
            receiptNo: share.receiptNo,
            status: share.status,
          })),
      ),
    [sacrifices],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr");
    return rows.filter((row) => {
      if (applied.department && row.department !== applied.department) return false;
      if (applied.group && row.group !== applied.group) return false;
      if (applied.city && row.originCountry !== applied.city) return false;
      if (applied.district && row.city !== applied.district) return false;
      if (applied.country && row.country !== applied.country) return false;
      if (applied.partner && row.partner !== applied.partner) return false;
      if (applied.destinationRegion && row.region !== applied.destinationRegion) return false;
      if (applied.payment && row.paymentMethod !== applied.payment) return false;
      if (applied.currency && row.currencyCode !== applied.currency) return false;
      if (applied.year && row.projectYear !== applied.year) return false;
      if (applied.month && (!row.date || new Date(row.date).getMonth() + 1 !== Number(applied.month))) return false;
      if (
        normalizedQuery &&
        !`${row.projectName} ${row.firstName} ${row.lastName} ${row.phone} ${row.projectNo} ${row.city} ${row.district} ${row.country} ${row.partner} ${row.region}`
          .toLocaleLowerCase("tr")
          .includes(normalizedQuery)
      ) return false;
      return true;
    });
  }, [applied, query, rows]);

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue), "tr", {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    });
  }, [filteredRows, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function applyFilters() {
    setApplied({ department, group, city, district, country, partner, destinationRegion, payment, currency, year, month });
  }

  function resetFilters() {
    setDepartment("");
    setGroup("");
    setCity("");
    setDistrict("");
    setCountry("");
    setPartner("");
    setDestinationRegion("");
    setPayment("");
    setCurrency("");
    setYear("");
    setMonth("");
    setQuery("");
    setApplied({ department: "", group: "", city: "", district: "", country: "", partner: "", destinationRegion: "", payment: "", currency: "", year: "", month: "" });
  }

  function exportCsv() {
    const records = [
      ["Proje Adı", "Proje No", "Hisse", "Adı", "Soyadı", "Telefon", "İl Adı", "İlçe", "Tarih", "Cinsi", "Grubu", "Tutar", "Ülke Adı", "Partner", "Bölge", "Ödeme Şekli", "Adet", "Makbuz No"],
      ...sortedRows.map((row) => [
        row.projectName,
        row.projectNo.toString(),
        row.shareNo.toString(),
        row.firstName,
        row.lastName,
        row.phone,
        row.city,
        row.district,
        row.date ? new Intl.DateTimeFormat("tr-TR").format(new Date(row.date)) : "",
        row.donationType,
        row.group,
        row.amount.toString(),
        row.country,
        row.partner,
        row.region,
        PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)?.label ?? row.paymentMethod,
        row.quantity.toString(),
        row.receiptNo,
      ]),
    ];
    const csv = `\uFEFF${records.map((record) => record.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kurban-bagislari.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyRows() {
    const records = sortedRows.map((row) => [
      row.projectName,
      row.projectNo,
      row.firstName,
      row.lastName,
      row.phone,
      row.city,
      row.date ? new Intl.DateTimeFormat("tr-TR").format(new Date(row.date)) : "",
      row.donationType,
      row.group,
      row.amount,
      row.country,
      row.partner,
      row.region,
      PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)?.label ?? row.paymentMethod,
      row.quantity,
      row.receiptNo,
    ].join("\t"));
    await navigator.clipboard.writeText(records.join("\n"));
  }

  async function removeDonation(row: ProjectRow) {
    if (!row.donationId || !window.confirm(`${row.firstName} ${row.lastName} bağış kaydı iptal edilsin mi? İlgili hisse yeniden boşaltılacak.`)) return;
    setDeletingId(row.donationId);
    setError("");
    try {
      const response = await fetch(`/api/donations/${row.donationId}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Bağış kaydı silinemedi.");
      await loadSacrifices();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bağış kaydı silinemedi.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <CowIcon className="size-4" /> Kurban yönetimi
          </div>
          <h2 className="text-xl font-bold text-[#0b2b3c]">Vacip kurban bağışı</h2>
          <p className="mt-1 text-sm text-slate-500">Projeleri filtreleyin, bağışçı kayıtlarını inceleyin ve yeni kurban bağışı ekleyin.</p>
        </div>
        <button
          type="button"
          onClick={() => setDonationFormOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:self-auto"
        >
          <Plus className="size-4" /> Bağış Ekle
        </button>
      </div>

      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Filter className="size-4" /></span>
          <div>
            <h3 className="font-bold text-[#0b2b3c]">Proje listesi</h3>
            <p className="mt-0.5 text-xs text-slate-500">Aradığınız kurban projesini filtreleyerek bulun.</p>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-5">
          <FilterSelect label="Bölüm" value={department} onChange={setDepartment}>
            <option value="">Tüm bölümler</option>
            {departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Yıl" value={year} onChange={setYear}>
            <option value="">Tüm yıllar</option>
            {[2026, 2025, 2024].map((item) => <option key={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Ay" value={month} onChange={setMonth}>
            <option value="">Tüm aylar</option>
            {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Bağış cinsi" value="Kurban" onChange={() => undefined}>
            <option value="Kurban">Kurban</option>
          </FilterSelect>
          <FilterSelect label="Bağış grubu" value={group} onChange={setGroup}>
            <option value="">Tüm gruplar</option>
            {donationGroups.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Gelen il" value={city} onChange={(value) => { setCity(value); setDistrict(""); }}>
            <option value="">Tüm iller</option>
            {originCountries.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Gelen ilçe" value={district} onChange={setDistrict}>
            <option value="">Tüm ilçeler</option>
            {districts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Ödeme şekli" value={payment} onChange={setPayment}>
            <option value="">Tüm ödeme şekilleri</option>
            {PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Para birimi" value={currency} onChange={setCurrency}>
            <option value="">Tüm para birimleri</option>
            {["USD", "EUR", "TRY", "GBP"].map((code) => currencies.find((item) => item.code === code)).filter((item): item is DefinitionOption => Boolean(item)).map((item) => <option key={item.id} value={item.code}>{item.code === "USD" ? "$" : item.code === "EUR" ? "EURO" : item.code === "TRY" ? "TL" : "STERLİN"}</option>)}
          </FilterSelect>
          <FilterSelect label="Giden ülke" value={country} onChange={(value) => { setCountry(value); setPartner(""); setDestinationRegion(""); }}>
            <option value="">Tüm ülkeler</option>
            {destinationCountries.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Partner" value={partner} onChange={(value) => { setPartner(value); setDestinationRegion(""); }}>
            <option value="">Tüm partnerler</option>
            {countryPartners.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Giden bölge" value={destinationRegion} onChange={setDestinationRegion}>
            <option value="">Tüm bölgeler</option>
            {countryRegions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </FilterSelect>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-5 xl:justify-center">
            <Button type="button" variant="success" className="min-w-36" onClick={applyFilters}><Search className="size-4" /> Sorgula</Button>
            <Button type="button" variant="ghost" onClick={resetFilters}><RotateCcw className="size-4" /> Temizle</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-bold text-[#0b2b3c]">Proje listesi</h3>
            <p className="mt-1 text-xs text-slate-500">Kurban projelerine bağlı bağışçı kayıtları</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-8 items-center rounded-lg bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700">Göster: 50 kayıt</span>
            <Button size="sm" variant="outline" onClick={() => void copyRows()} disabled={!sortedRows.length}><Copy className="size-4" /> Kopyala</Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filteredRows.length}><Download className="size-4" /> Excel / CSV</Button>
            <Button size="sm" variant="outline" onClick={() => printDonationList(sortedRows)} disabled={!sortedRows.length}><Printer className="size-4" /> Yazdır</Button>
          </div>
        </div>
        <div className="border-b border-slate-100 p-4 sm:px-6">
          <div className="relative ml-auto max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pl-9 text-xs" placeholder="Listede ara..." />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="size-5 animate-spin" /> Projeler yükleniyor</div>
        ) : error ? (
          <p className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2200px] text-left">
              <thead className="bg-[#02b3aa] text-[10px] uppercase tracking-wide text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Seç</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Yazdır</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Güncelle</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Sil</th>
                  <SortableHeader label="Proje Adı" sortKey="projectName" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Proje No" sortKey="projectNo" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Hisse" sortKey="shareNo" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Adı" sortKey="firstName" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Soyadı" sortKey="lastName" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Telefon" sortKey="phone" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="İl" sortKey="city" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="İlçe" sortKey="district" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Tarih" sortKey="date" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Bağış Cinsi" sortKey="donationType" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Bağış Grubu" sortKey="group" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Ödeme" sortKey="paymentMethod" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Tutar" sortKey="amount" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Para Birimi" sortKey="currency" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Ülke" sortKey="country" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Partner" sortKey="partner" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Bölge" sortKey="region" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Durum" sortKey="status" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Adet" sortKey="quantity" sort={sort} onSort={toggleSort} />
                  <SortableHeader label="Makbuz No" sortKey="receiptNo" sort={sort} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="text-xs text-slate-600 transition hover:bg-emerald-50/40">
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`${row.projectNo} numaralı projeyi seç`} className="size-4 accent-emerald-600" /></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => printDonationReceipt(row)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" aria-label="Kaydı yazdır"><Printer className="size-3.5" /></button></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => setEditingRow(row)} className="rounded-lg border border-amber-100 p-2 text-amber-600 hover:border-amber-300 hover:bg-amber-50" aria-label="Bağış kaydını güncelle"><Pencil className="size-3.5" /></button></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => void removeDonation(row)} disabled={deletingId === row.donationId} className="rounded-lg border border-red-100 p-2 text-red-500 hover:border-red-300 hover:bg-red-50 disabled:opacity-50" aria-label="Bağış kaydını sil">{deletingId === row.donationId ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></td>
                    <td className="max-w-52 px-4 py-3 font-semibold text-slate-800">{row.projectName}</td>
                    <td className="px-4 py-3 font-bold text-[#0b2b3c]">{row.projectNo}</td>
                    <td className="px-4 py-3">{row.shareNo}. hisse</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.firstName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.lastName}</td>
                    <td className="px-4 py-3">{row.phone}</td>
                    <td className="px-4 py-3">{row.city || "—"}</td>
                    <td className="px-4 py-3">{row.district || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.date ? new Intl.DateTimeFormat("tr-TR").format(new Date(row.date)) : "—"}</td>
                    <td className="px-4 py-3">Kurban</td>
                    <td className="px-4 py-3">{row.group}</td>
                    <td className="px-4 py-3">{PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)?.label ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-[#0b2b3c]">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3">{row.currency}</td>
                    <td className="px-4 py-3">{row.country || "—"}</td>
                    <td className="px-4 py-3">{row.partner || "—"}</td>
                    <td className="px-4 py-3">{row.region}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{row.status === "FILLED" ? "Tamamlandı" : "Bekliyor"}</span></td>
                    <td className="px-4 py-3 text-center font-semibold">{row.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{row.receiptNo || "—"}</td>
                  </tr>
                ))}
                {!sortedRows.length && (
                  <tr><td colSpan={24} className="px-6 py-14 text-center"><CowIcon className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Kayıt bulunamadı</p><p className="mt-1 text-xs text-slate-500">Seçilen filtrelere ait kurban bağışı henüz bulunmuyor.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 sm:px-6">
          <span>Gösterilen kayıt: {filteredRows.length}</span>
          <span>Toplam {rows.length} kayıt</span>
        </div>
      </Card>
      {donationFormOpen && (
        <SacrificeDonationForm modal onClose={() => setDonationFormOpen(false)} onSaved={loadSacrifices} />
      )}
      {editingRow && (
        <SacrificeDonationForm
          modal
          editData={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={async () => {
            setEditingRow(null);
            await loadSacrifices();
          }}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th className="whitespace-nowrap px-2 py-2 font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label={`${label} sütununu sırala`}
      >
        {label}
        {active ? (
          sort.direction === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
        ) : (
          <ArrowDownUp className="size-3 opacity-60" />
        )}
      </button>
    </th>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {children}
      </select>
    </label>
  );
}
