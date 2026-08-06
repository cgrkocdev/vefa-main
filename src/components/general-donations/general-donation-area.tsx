"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Plus, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { DonationForm, type GeneralDonationDefinition } from "@/components/donation-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type GeneralDonation = {
  id: string;
  date: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  type: string;
  group: string;
  quantity: number;
  country: string;
  paymentMethod: string;
  amount: number;
  currencyCode: string;
  receiptNo: string;
  orderStatus: boolean;
};
type Filters = {
  typeId: string;
  groupId: string;
  city: string;
  status: string;
  year: string;
  month: string;
  paymentMethodId: string;
};

const emptyFilters: Filters = {
  typeId: "",
  groupId: "",
  city: "",
  status: "",
  year: "",
  month: "",
  paymentMethodId: "",
};
const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";

export function GeneralDonationArea() {
  const [formOpen, setFormOpen] = useState(false);
  const [definitions, setDefinitions] = useState<GeneralDonationDefinition[]>([]);
  const [definitionsError, setDefinitionsError] = useState("");
  const [donations, setDonations] = useState<GeneralDonation[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [editingDonation, setEditingDonation] = useState<GeneralDonation | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreate, setQuickCreate] = useState({ typeCode: "", paymentMethodCode: "" });

  const loadDonations = useCallback(async (activeFilters: Filters, quickSearch = "") => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      if (quickSearch.trim()) query.set("q", quickSearch.trim());
      const response = await fetch(`/api/general-donations?${query.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { donations?: GeneralDonation[]; message?: string };
      if (!response.ok) throw new Error(data.message);
      setDonations(data.donations ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Genel bağış kayıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch("/api/definitions").then(async (response) => {
        const data = (await response.json()) as { definitions?: GeneralDonationDefinition[]; message?: string };
        if (!response.ok) throw new Error(data.message);
        setDefinitions(data.definitions ?? []);
        const query = new URLSearchParams(window.location.search);
        if (query.get("yeni") === "1") {
          setQuickCreate({ typeCode: query.get("tur") ?? "", paymentMethodCode: query.get("odeme") ?? "" });
          setFormOpen(true);
        }
      }),
    ]).catch((reason) => setDefinitionsError(reason instanceof Error ? reason.message : "Form tanımları yüklenemedi."));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDonations(applied, searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [applied, loadDonations, searchQuery]);

  const byType = (type: string) => definitions.filter((item) => item.type === type);

  async function removeDonation(donation: GeneralDonation) {
    if (!window.confirm(`${donation.firstName} ${donation.lastName} genel bağış kaydı silinsin mi? Kayıt denetim geçmişinde iptal edilmiş olarak korunacaktır.`)) return;
    setDeletingId(donation.id);
    setError("");
    try {
      const response = await fetch(`/api/donations/${donation.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Genel bağış silinemedi.");
      await loadDonations(applied, searchQuery);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Genel bağış silinemedi.");
    } finally {
      setDeletingId("");
    }
  }

  function applyFilters() {
    setApplied(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Bağış</p>
          <h2 className="mt-1 text-xl font-bold text-[#0b2b3c]">Genel Bağış</h2>
        </div>
        <Button variant="success" onClick={() => setFormOpen(true)} disabled={!definitions.length}>
          {!definitions.length && !definitionsError ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {definitions.length ? "Bağış Ekle" : "Form hazırlanıyor"}
        </Button>
      </div>

      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-[#0b2b3c]">Sorgulama</h3></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Cinsi (Türü)" value={filters.typeId} onChange={(value) => setFilters((current) => ({ ...current, typeId: value, groupId: "" }))} items={byType("DONATION_TYPE").filter((item) => item.code !== "KURBAN")} />
          <FilterSelect label="Grubu" value={filters.groupId} onChange={(value) => setFilters((current) => ({ ...current, groupId: value }))} items={byType("GENERAL_DONATION_GROUP").filter((item) => !filters.typeId || item.parentId === filters.typeId)} />
          <FilterSelect label="Gelen İl" value={filters.city} onChange={(value) => setFilters((current) => ({ ...current, city: value }))} items={byType("ORIGIN_CITY")} valueByName />
          <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Genel Durumu</span><select className={selectClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Seçiniz</option><option value="STANDARD">Standart</option><option value="ORDERED">Sipariş</option></select></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Yıl</span><select className={selectClass} value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}><option value="">Seçiniz</option>{[2026, 2025, 2024].map((year) => <option key={year}>{year}</option>)}</select></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">Ay</span><select className={selectClass} value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} disabled={!filters.year}><option value="">Seçiniz</option>{["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
          <FilterSelect label="Ödeme Şekli" value={filters.paymentMethodId} onChange={(value) => setFilters((current) => ({ ...current, paymentMethodId: value }))} items={byType("PAYMENT_METHOD")} />
          <div className="flex items-end gap-2">
            <Button type="button" variant="success" className="min-w-32" onClick={applyFilters}><Search className="size-4" /> Sorgula</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}><RotateCcw className="size-4" /> Temizle</Button>
          </div>
        </div>
      </Card>

      {(error || definitionsError) && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error || definitionsError}</p>}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-[#0b2b3c]">Genel Bağışçı Listesi</h3>
            <p className="mt-1 text-xs text-slate-500">Filtrelere uyan genel bağış kayıtları</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Ad, telefon veya makbuz no ara"
              aria-label="Genel bağışçı listesinde ara"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
            />
          </label>
        </div>
        {loading ? (
          <div className="flex justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="size-5 animate-spin" /> Kayıtlar yükleniyor</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-xs">
              <thead className="bg-[#02b3aa] text-white">
                <tr>{["Güncelle", "Sil", "Tarih", "Adı", "Soyadı", "Telefon", "İl Adı", "Cinsi", "Grup", "Gel. Adet", "Ülke Adı", "Öd. Şekli", "Tutar", "Makbuz No"].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((donation) => (
                  <tr key={donation.id} className="text-slate-700 hover:bg-emerald-50/40">
                    <td className="px-4 py-3"><button type="button" onClick={() => setEditingDonation(donation)} className="rounded-lg border border-amber-100 p-2 text-amber-600 hover:border-amber-300 hover:bg-amber-50" aria-label={`${donation.firstName} ${donation.lastName} kaydını güncelle`}><Pencil className="size-3.5" /></button></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => void removeDonation(donation)} disabled={deletingId === donation.id} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50">{deletingId === donation.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></td>
                    <td className="whitespace-nowrap px-4 py-3">{new Intl.DateTimeFormat("tr-TR").format(new Date(donation.date))}</td>
                    <td className="px-4 py-3 font-semibold">{donation.firstName}</td>
                    <td className="px-4 py-3 font-semibold">{donation.lastName}</td>
                    <td className="px-4 py-3">{donation.phone}</td>
                    <td className="px-4 py-3">{[donation.city, donation.district].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-4 py-3">{donation.type || "—"}</td>
                    <td className="px-4 py-3">{donation.group || "—"}</td>
                    <td className="px-4 py-3 text-center font-semibold">{donation.quantity}</td>
                    <td className="px-4 py-3">{donation.country || "—"}</td>
                    <td className="px-4 py-3">{donation.paymentMethod || "—"}</td>
                    <td className="px-4 py-3 font-bold text-[#0b2b3c]">{formatCurrency(donation.amount, donation.currencyCode)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{donation.receiptNo || "—"}</td>
                  </tr>
                ))}
                {!donations.length && <tr><td colSpan={14} className="p-14 text-center text-sm text-slate-500">{searchQuery.trim() ? "Aramanızla eşleşen genel bağış kaydı bulunamadı." : "Sorguya uygun genel bağış kaydı bulunamadı."}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Gösterilen kayıt: {donations.length}</div>
      </Card>

      {formOpen && (
        <DonationForm
          modal
          initialDefinitions={definitions}
          initialTypeCode={quickCreate.typeCode}
          initialPaymentMethodCode={quickCreate.paymentMethodCode}
          onClose={() => setFormOpen(false)}
          onSaved={async () => {
            setFormOpen(false);
            await loadDonations(applied, searchQuery);
          }}
        />
      )}
      {editingDonation && (
        <GeneralDonationEditModal
          donation={editingDonation}
          definitions={definitions}
          onClose={() => setEditingDonation(null)}
          onSaved={async () => {
            setEditingDonation(null);
            await loadDonations(applied, searchQuery);
          }}
        />
      )}
    </div>
  );
}

function GeneralDonationEditModal({
  donation,
  definitions,
  onClose,
  onSaved,
}: {
  donation: GeneralDonation;
  definitions: GeneralDonationDefinition[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const paymentMethods = definitions.filter((item) => item.type === "PAYMENT_METHOD");
  const initialPayment = paymentMethods.find((item) => item.name === donation.paymentMethod)?.code ?? "";
  const [form, setForm] = useState({
    firstName: donation.firstName,
    lastName: donation.lastName,
    phone: donation.phone,
    city: donation.city,
    district: donation.district,
    date: donation.date.slice(0, 10),
    paymentMethod: initialPayment,
    amount: String(donation.amount),
    receiptNo: donation.receiptNo,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/donations/${donation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          city: form.city || null,
          district: form.district || null,
          date: form.date,
          paymentMethod: form.paymentMethod,
          amount: Number(form.amount),
          receiptNumber: form.receiptNo,
          quantity: donation.quantity,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Genel bağış kaydı güncellenemedi.");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Genel bağış kaydı güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-950/30">
        <div className="relative bg-[#126653] px-5 py-4 text-center text-white">
          <h3 className="font-bold uppercase tracking-wide">Genel Bağış Kaydını Güncelle</h3>
          <button type="button" onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-white/15" aria-label="Kapat"><X className="size-5" /></button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <EditField label="Adı"><input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className={selectClass} /></EditField>
          <EditField label="Soyadı"><input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} className={selectClass} /></EditField>
          <EditField label="Telefon"><input required value={form.phone} onChange={(event) => update("phone", event.target.value)} className={selectClass} /></EditField>
          <EditField label="Tarih"><input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} className={selectClass} /></EditField>
          <EditField label="İl"><input value={form.city} onChange={(event) => update("city", event.target.value)} className={selectClass} /></EditField>
          <EditField label="İlçe"><input value={form.district} onChange={(event) => update("district", event.target.value)} className={selectClass} /></EditField>
          <EditField label="Ödeme Şekli"><select required value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className={selectClass}><option value="">Seçiniz</option>{paymentMethods.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select></EditField>
          <EditField label="Tutar"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} className={selectClass} /></EditField>
          <EditField label="Makbuz No"><input required value={form.receiptNo} onChange={(event) => update("receiptNo", event.target.value)} className={selectClass} /></EditField>
        </div>
        {error && <p className="mx-5 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
          <Button type="submit" variant="success" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Güncelle</Button>
        </div>
      </form>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>{children}</label>;
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
  valueByName = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: GeneralDonationDefinition[];
  valueByName?: boolean;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seçiniz</option>
        {items.map((item) => <option key={item.id} value={valueByName ? item.name : item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}
