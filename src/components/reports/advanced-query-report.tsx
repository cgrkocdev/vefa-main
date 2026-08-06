"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  LoaderCircle,
  Printer,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Definition = {
  id: string;
  type: string;
  code: string;
  name: string;
  symbol: string | null;
  parentId: string | null;
};
type Row = {
  id: string;
  receiptNo: string;
  donorName: string;
  phone: string;
  type: string;
  group: string;
  originCountry: string;
  originCity: string;
  originDistrict: string;
  destinationCountry: string;
  destinationRegion: string;
  partner: string;
  payment: string;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  quantity: number;
  unitType: string;
  unitPrice: number;
  amount: number;
  foreignAmount: number | null;
  scope: string;
  projectNumber: number | null;
  projectName: string | null;
  reality: string;
  specialCondition: boolean;
  orderStatus: boolean;
  status: string;
  description: string;
  createdAt: string;
};
type Total = {
  currencyId: string;
  currency: string;
  code: string;
  symbol: string;
  amount: number;
  quantity: number;
  records: number;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
type Filters = {
  q: string;
  typeId: string;
  groupId: string;
  originCountry: string;
  originCity: string;
  originDistrict: string;
  destinationCountryId: string;
  destinationRegionId: string;
  partnerId: string;
  from: string;
  to: string;
  year: string;
  month: string;
  scope: string;
  reality: string;
  paymentMethodId: string;
  currencyId: string;
  status: string;
  specialCondition: string;
  orderStatus: string;
  sortBy: string;
  sortDirection: string;
};
const initial: Filters = {
  q: "",
  typeId: "",
  groupId: "",
  originCountry: "",
  originCity: "",
  originDistrict: "",
  destinationCountryId: "",
  destinationRegionId: "",
  partnerId: "",
  from: "",
  to: "",
  year: "2026",
  month: "",
  scope: "",
  reality: "",
  paymentMethodId: "",
  currencyId: "",
  status: "COMPLETED",
  specialCondition: "",
  orderStatus: "",
  sortBy: "createdAt",
  sortDirection: "desc",
};
const control =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500";

export function AdvancedQueryReport() {
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [origins, setOrigins] = useState<{
    countries: string[];
    cities: string[];
    districts: string[];
  }>({ countries: [], cities: [], districts: [] });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const queryString = useCallback(
    (active: Filters, page = 1, pageSize = 50) => {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      Object.entries(active).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      return query.toString();
    },
    [],
  );
  const load = useCallback(
    async (active: Filters, page = 1) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/reports/advanced-query?${queryString(active, page)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          rows?: Row[];
          totals?: Total[];
          pagination?: Pagination;
          filters?: {
            definitions: Definition[];
            origins: {
              countries: string[];
              cities: string[];
              districts: string[];
            };
          };
          message?: string;
        };
        if (!response.ok) throw new Error(data.message);
        setRows(data.rows ?? []);
        setTotals(data.totals ?? []);
        setPagination(
          data.pagination ?? { page: 1, pageSize: 50, total: 0, pageCount: 1 },
        );
        setDefinitions(data.filters?.definitions ?? []);
        setOrigins(
          data.filters?.origins ?? { countries: [], cities: [], districts: [] },
        );
        setApplied(active);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Rapor sorgusu çalıştırılamadı.",
        );
      } finally {
        setLoading(false);
      }
    },
    [queryString],
  );
  useEffect(() => {
    void load(initial);
  }, [load]);
  const byType = (type: string) =>
    definitions.filter((item) => item.type === type);
  const groups = definitions.filter((item) =>
    ["DONATION_GROUP", "GENERAL_DONATION_GROUP"].includes(item.type),
  );
  const regions = byType("DESTINATION_REGION").filter(
    (item) =>
      !filters.destinationCountryId ||
      item.parentId === filters.destinationCountryId ||
      item.parentId === filters.partnerId,
  );
  const partners = byType("PARTNER").filter(
    (item) =>
      !filters.destinationCountryId ||
      item.parentId === filters.destinationCountryId,
  );
  const update = (key: keyof Filters, value: string) =>
    setFilters((current) =>
      key === "originCountry"
        ? {
            ...current,
            originCountry: value,
            originCity: "",
            originDistrict: "",
          }
        : key === "originCity"
          ? { ...current, originCity: value, originDistrict: "" }
          : key === "destinationCountryId"
            ? {
                ...current,
                destinationCountryId: value,
                destinationRegionId: "",
                partnerId: "",
              }
            : { ...current, [key]: value },
    );
  async function allRows() {
    const response = await fetch(
      `/api/reports/advanced-query?${queryString(applied, 1, 500)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as { rows?: Row[] };
    return response.ok ? (data.rows ?? []) : rows;
  }
  const csvRows = (items: Row[]) => [
    [
      "Makbuz",
      "Bağışçı",
      "Telefon",
      "Tür",
      "Grup",
      "Gelen Ülke",
      "Gelen Şehir",
      "Gelen İlçe",
      "Giden Ülke",
      "Giden Bölge",
      "Partner",
      "Ödeme",
      "Adet",
      "Birim Fiyat",
      "Tutar",
      "Para Birimi",
      "Bölüm",
      "Proje",
      "Durum",
      "Tarih",
    ],
    ...items.map((r) => [
      r.receiptNo,
      r.donorName,
      r.phone,
      r.type,
      r.group,
      r.originCountry,
      r.originCity,
      r.originDistrict,
      r.destinationCountry,
      r.destinationRegion,
      r.partner,
      r.payment,
      String(r.quantity),
      String(r.unitPrice),
      String(r.amount),
      r.currencyCode,
      r.scope,
      r.projectName ?? "—",
      r.orderStatus ? "Gönderildi" : "Bekliyor",
      new Date(r.createdAt).toLocaleString("tr-TR"),
    ]),
  ];
  async function exportCsv() {
    const items = await allRows();
    const csv = `\uFEFF${csvRows(items)
      .map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(";"))
      .join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gelismis-rapor-sorgu.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function copy() {
    const items = await allRows();
    await navigator.clipboard.writeText(
      csvRows(items)
        .map((r) => r.join("\t"))
        .join("\n"),
    );
  }
  async function print() {
    const items = await allRows();
    const popup = window.open("", "advanced-report", "width=1200,height=850");
    if (!popup) return;
    const body = items
      .map(
        (r) =>
          `<tr><td>${e(r.receiptNo)}</td><td>${e(r.donorName)}</td><td>${e(r.type)}</td><td>${e(`${r.originCountry} / ${r.originCity} / ${r.originDistrict}`)}</td><td>${e(`${r.destinationCountry} / ${r.destinationRegion}`)}</td><td>${e(r.payment)}</td><td>${r.quantity}</td><td>${e(money(r.amount, r.currencySymbol))}</td><td>${e(new Date(r.createdAt).toLocaleDateString("tr-TR"))}</td></tr>`,
      )
      .join("");
    popup.document.write(
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Gelişmiş Bağış Raporu</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial;color:#183044;margin:0}header{display:flex;justify-content:space-between;border-bottom:3px solid #02b3aa;padding-bottom:10px}h1{font-size:20px;margin:0}p{font-size:10px;color:#64748b}.totals{display:flex;gap:10px;margin:12px 0}.total{flex:1;background:#e9fbf7;border:1px solid #b7eadf;padding:10px;border-radius:8px}.total strong{display:block;font-size:16px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#02b3aa;color:white;text-align:left;padding:6px}td{padding:5px;border-bottom:1px solid #dce5e9}tr:nth-child(even){background:#f7faf9}footer{margin-top:10px;border-top:1px solid #ccd8dc;padding-top:6px;font-size:8px;color:#64748b}</style></head><body><header><div><h1>Yedirenk Derneği · Gelişmiş Bağış Raporu</h1><p>${e(summary(applied))}</p></div><div><strong>${items.length} kayıt</strong><p>${e(new Date().toLocaleString("tr-TR"))}</p></div></header><section class="totals">${totals.map((t) => `<div class="total"><small>${e(t.currency)}</small><strong>${e(money(t.amount, t.symbol))}</strong><span>${t.records} kayıt · ${t.quantity} birim</span></div>`).join("")}</section><table><thead><tr><th>Makbuz</th><th>Bağışçı</th><th>Tür</th><th>Gelen Yer</th><th>Giden Yer</th><th>Ödeme</th><th>Adet</th><th>Tutar</th><th>Tarih</th></tr></thead><tbody>${body || '<tr><td colspan="9">Kayıt bulunamadı.</td></tr>'}</tbody></table><footer>Bu rapor Yedirenk Derneği Bağış Yönetimi tarafından sorgu anındaki verilerle oluşturulmuştur.</footer><script>addEventListener('load',()=>setTimeout(()=>print(),250))<\/script></body></html>`,
    );
    popup.document.close();
  }
  const currencyTotals = useMemo(
    () => [
      {
        code: "TRY",
        symbol: "₺",
        label: "Sorgu Sonuç Toplam Tutarı (₺)",
        amount: totals.find((item) => item.code === "TRY")?.amount ?? 0,
      },
      {
        code: "USD",
        symbol: "$",
        label: "Sorgu Sonuç Toplam Tutarı ($)",
        amount: totals.find((item) => item.code === "USD")?.amount ?? 0,
      },
      {
        code: "EUR",
        symbol: "€",
        label: "Sorgu Sonuç Toplam Tutarı (€)",
        amount: totals.find((item) => item.code === "EUR")?.amount ?? 0,
      },
    ],
    [totals],
  );
  return (
    <div className="mx-auto max-w-[1580px]">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#0b2b3c]">Rapor Sorgu</h2>
        <p className="mt-1 text-xs text-slate-500">
          Genel bağış ve kurban kayıtları için sistemin en kapsamlı birleşik
          raporu
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-3 font-bold">Gelişmiş Sorgulama</div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Bağışçı, makbuz, telefon veya proje ara">
            <input
              className={control}
              value={filters.q}
              onChange={(x) => update("q", x.target.value)}
              placeholder="Arama..."
            />
          </Field>
          <Select
            label="Bağış Türü (Cinsi)"
            value={filters.typeId}
            items={byType("DONATION_TYPE")}
            set={(v) => update("typeId", v)}
          />
          <Select
            label="Bağış Grubu"
            value={filters.groupId}
            items={groups}
            set={(v) => update("groupId", v)}
          />
          <StringSelect
            label="Bağış Gelen Ülke"
            value={filters.originCountry}
            items={origins.countries}
            set={(v) => update("originCountry", v)}
          />
          <StringSelect
            label="Bağış Gelen Şehir"
            value={filters.originCity}
            items={origins.cities}
            set={(v) => update("originCity", v)}
          />
          <StringSelect
            label="Bağış Gelen İlçe"
            value={filters.originDistrict}
            items={origins.districts}
            set={(v) => update("originDistrict", v)}
          />
          <Select
            label="Bağış Gönderilen Ülke"
            value={filters.destinationCountryId}
            items={byType("DESTINATION_COUNTRY")}
            set={(v) => update("destinationCountryId", v)}
          />
          <Select
            label="Bağış Gönderilen Bölge"
            value={filters.destinationRegionId}
            items={regions}
            set={(v) => update("destinationRegionId", v)}
          />
          <Select
            label="Partner"
            value={filters.partnerId}
            items={partners}
            set={(v) => update("partnerId", v)}
          />
          <Field label="İlk Tarih">
            <input
              className={control}
              type="date"
              value={filters.from}
              onChange={(x) => update("from", x.target.value)}
            />
          </Field>
          <Field label="Son Tarih">
            <input
              className={control}
              type="date"
              min={filters.from}
              value={filters.to}
              onChange={(x) => update("to", x.target.value)}
            />
          </Field>
          <Field label="Yıl">
            <select
              className={`${control} bg-yellow-100 font-bold`}
              value={filters.year}
              onChange={(x) => update("year", x.target.value)}
            >
              <option value="">Tümü</option>
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="Ay">
            <select
              className={control}
              value={filters.month}
              onChange={(x) => update("month", x.target.value)}
            >
              <option value="">Tümü</option>
              {months.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <EnumSelect
            label="İşlem Bölümü"
            value={filters.scope}
            options={[
              ["GENERAL", "Genel Bağış"],
              ["SACRIFICE", "Kurban"],
            ]}
            set={(v) => update("scope", v)}
          />
          <EnumSelect
            label="Gerçek Durum"
            value={filters.reality}
            options={[
              ["REAL", "Gerçek"],
              ["VIRTUAL", "Sanal"],
            ]}
            set={(v) => update("reality", v)}
          />
          <Select
            label="Ödeme Şekli"
            value={filters.paymentMethodId}
            items={byType("PAYMENT_METHOD")}
            set={(v) => update("paymentMethodId", v)}
          />
          <Select
            label="Para Birimi"
            value={filters.currencyId}
            items={byType("CURRENCY")}
            set={(v) => update("currencyId", v)}
          />
          <EnumSelect
            label="Kayıt Durumu"
            value={filters.status}
            options={[
              ["COMPLETED", "Aktif"],
              ["CANCELLED", "İptal"],
            ]}
            set={(v) => update("status", v)}
          />
          <EnumSelect
            label="Özel Şart"
            value={filters.specialCondition}
            options={[
              ["true", "Var"],
              ["false", "Yok"],
            ]}
            set={(v) => update("specialCondition", v)}
          />
          <EnumSelect
            label="Gönderim / Sipariş"
            value={filters.orderStatus}
            options={[
              ["true", "Gönderildi"],
              ["false", "Bekliyor"],
            ]}
            set={(v) => update("orderStatus", v)}
          />
          <div className="flex items-end gap-2">
            <Button
              variant="success"
              className="flex-1"
              onClick={() => void load(filters, 1)}
            >
              <Search className="size-4" /> Sorgula
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters(initial);
                void load(initial, 1);
              }}
            >
              Temizle
            </Button>
          </div>
        </div>
      </Card>
      <TotalsStrip items={currencyTotals} loading={loading} />
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h3 className="font-bold">Genel Bağış Listesi</h3>
            <p className="text-xs text-slate-500">
              {pagination.total} sonuç · Bu sayfada {rows.length} kayıt · Toplamlar
              sorgunun tamamına aittir
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void copy()}>
              <Copy className="size-4" /> Kopyala
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={() => void exportCsv()}
            >
              <Download className="size-4" /> Excel
            </Button>
            <Button size="sm" variant="primary" onClick={() => void print()}>
              <Printer className="size-4" /> A4 Yazdır / PDF
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-left text-[10px]">
            <thead className="bg-[#02b3aa] text-white">
              <tr>
                {[
                  "Detay",
                  "Makbuz",
                  "Bağışçı",
                  "Telefon",
                  "Tür / Grup",
                  "Gelen Yer",
                  "Gönderilen Yer",
                  "Partner",
                  "Ödeme",
                  "Adet / Birim",
                  "Birim Fiyat",
                  "Tutar",
                  "Bölüm / Proje",
                  "Durum",
                  "Tarih",
                ].map((h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} className="p-16 text-center">
                    <LoaderCircle className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b even:bg-slate-50">
                    <td className="p-2">
                      <button
                        className="rounded bg-emerald-700 px-2 py-1.5 font-semibold text-white"
                        onClick={() => setSelected(r)}
                      >
                        Detay
                      </button>
                    </td>
                    <td className="p-3 font-medium">{r.receiptNo}</td>
                    <td className="p-3 font-bold">{r.donorName}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3">
                      {r.type}
                      <small className="block text-slate-400">{r.group}</small>
                    </td>
                    <td className="p-3">
                      {r.originCountry} / {r.originCity}
                      <small className="block">{r.originDistrict}</small>
                    </td>
                    <td className="p-3">
                      {r.destinationCountry}
                      <small className="block">{r.destinationRegion}</small>
                    </td>
                    <td className="p-3">{r.partner}</td>
                    <td className="p-3">{r.payment}</td>
                    <td className="p-3">
                      {r.quantity} {r.unitType}
                    </td>
                    <td className="p-3">
                      {money(r.unitPrice, r.currencySymbol)}
                    </td>
                    <td className="p-3 font-bold">
                      {money(r.amount, r.currencySymbol)}
                    </td>
                    <td className="p-3">
                      {r.scope}
                      <small className="block">
                        {r.projectNumber
                          ? `#${r.projectNumber} ${r.projectName}`
                          : "—"}
                      </small>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          r.orderStatus ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {r.orderStatus ? "Gönderildi" : "Bekliyor"}
                      </span>
                      <small className="block">
                        {r.status === "COMPLETED" ? "Aktif" : "İptal"}
                      </small>
                    </td>
                    <td className="p-3">
                      {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))
              )}
              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={15} className="p-16 text-center text-slate-500">
                    Filtrelere uygun kayıt bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot className="bg-[#376bc1] font-bold text-white">
              <tr>
                <td colSpan={10} className="p-3 text-right">
                  TOPLAM · {pagination.total} KAYIT
                </td>
                <td colSpan={5} className="p-3">
                  <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1">
                    {currencyTotals.map((item) => (
                      <span key={item.code} className="whitespace-nowrap">
                        {item.code === "TRY" ? "TL" : item.code}: {loading ? "—" : item.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.symbol}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-between border-t p-3">
          <span className="text-xs text-slate-500">
            Sayfa {pagination.page} / {pagination.pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => void load(applied, pagination.page - 1)}
            >
              <ChevronLeft className="size-4" /> Önceki
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.pageCount || loading}
              onClick={() => void load(applied, pagination.page + 1)}
            >
              Sonraki <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
      {error && (
        <p className="mt-3 rounded bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}
      {selected && <Detail row={selected} close={() => setSelected(null)} />}
    </div>
  );
}

function TotalsStrip({
  items,
  loading,
}: {
  items: Array<{ code: string; symbol: string; label: string; amount: number }>;
  loading: boolean;
}) {
  return (
    <section
      aria-label="Sorgu sonuç toplamları"
      className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-[#c9f5ee]"
    >
      <div className="grid sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.code}
            className="border-emerald-200 px-5 py-4 text-center sm:border-r sm:last:border-r-0"
          >
            <p className="text-[10px] font-bold text-emerald-900">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-[#173747]">
              {loading
                ? "—"
                : `${item.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.symbol}`}
            </p>
          </div>
        ))}
      </div>
      <p className="border-t border-emerald-200 px-4 py-1.5 text-center text-[9px] font-semibold text-blue-700">
        NOT: Toplamlar seçili filtrelerdeki tüm sonuçlardan hesaplanır; yalnızca
        ekranda görünen sayfayla sınırlı değildir.
      </p>
    </section>
  );
}
const months = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[10px] font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}
function Select({
  label,
  value,
  items,
  set,
}: {
  label: string;
  value: string;
  items: Definition[];
  set: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={control}
        value={value}
        onChange={(x) => set(x.target.value)}
      >
        <option value="">Seçiniz</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
function StringSelect({
  label,
  value,
  items,
  set,
}: {
  label: string;
  value: string;
  items: string[];
  set: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={control}
        value={value}
        onChange={(x) => set(x.target.value)}
      >
        <option value="">Seçiniz</option>
        {items.map((i) => (
          <option key={i}>{i}</option>
        ))}
      </select>
    </Field>
  );
}
function EnumSelect({
  label,
  value,
  options,
  set,
}: {
  label: string;
  value: string;
  options: string[][];
  set: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={control}
        value={value}
        onChange={(x) => set(x.target.value)}
      >
        <option value="">Tümü</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Detail({ row, close }: { row: Row; close: () => void }) {
  const fields = [
    ["Makbuz", row.receiptNo],
    ["Bağışçı", row.donorName],
    ["Telefon", row.phone],
    ["Tür / Grup", `${row.type} / ${row.group}`],
    [
      "Gelen Yer",
      `${row.originCountry} / ${row.originCity} / ${row.originDistrict}`,
    ],
    ["Gönderilen Yer", `${row.destinationCountry} / ${row.destinationRegion}`],
    ["Partner", row.partner],
    ["Ödeme", row.payment],
    ["Adet / Birim", `${row.quantity} ${row.unitType}`],
    ["Birim Fiyat", money(row.unitPrice, row.currencySymbol)],
    ["Toplam", money(row.amount, row.currencySymbol)],
    ["İşlem Bölümü", row.scope],
    ["Proje", row.projectName ?? "—"],
    ["Gerçek Durum", row.reality],
    ["Özel Şart", row.specialCondition ? "Var" : "Yok"],
    ["Gönderim", row.orderStatus ? "Gönderildi" : "Bekliyor"],
    ["Tarih", new Date(row.createdAt).toLocaleString("tr-TR")],
    ["Açıklama", row.description || "—"],
  ];
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4"
      onMouseDown={(x) => {
        if (x.target === x.currentTarget) close();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <h3 className="font-bold">Gelişmiş Kayıt Detayı</h3>
            <p className="text-xs text-slate-500">{row.receiptNo}</p>
          </div>
          <button onClick={close}>
            <X className="size-5" />
          </button>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-3 text-xs">
              <dt className="text-slate-400">{k}</dt>
              <dd className="mt-1 break-words font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
function money(value: number, symbol: string) {
  return `${symbol || "₺"}${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function e(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function summary(filters: Filters) {
  return `Yıl: ${filters.year || "Tümü"} · Ay: ${filters.month || "Tümü"} · Bölüm: ${filters.scope || "Tümü"} · Durum: ${filters.status || "Tümü"}`;
}
