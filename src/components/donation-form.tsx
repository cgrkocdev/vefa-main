"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, MessageCircle, Phone, Save, Search, X } from "lucide-react";
import { getCountries, getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import trLabels from "react-phone-number-input/locale/tr.json";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizePhone } from "@/lib/phone";

export type GeneralDonationDefinition = {
  id: string;
  type: string;
  code: string;
  name: string;
  parentId: string | null;
  symbol: string | null;
};

type FormState = {
  phone: string;
  firstName: string;
  lastName: string;
  originCountryId: string;
  originCityId: string;
  originDistrictId: string;
  paymentMethod: string;
  type: string;
  groupId: string;
  destinationCountryId: string;
  destinationRegionId: string;
  partnerId: string;
  unitCount: number | "";
  unitType: string;
  unitPrice: number | "";
  amount: number | "";
  foreignAmount: number | "";
  proxyOwner: string;
  address: string;
  specialCondition: boolean;
  orderStatus: boolean;
  smsProvider: string;
  sendMessage: boolean;
  sendWhatsapp: boolean;
  currencySms: boolean;
  description: string;
  receiptDate: string;
  receiptNo: string;
  currencyCode: string;
};

const initialState = (definitions: GeneralDonationDefinition[] = [], initialTypeCode = "", initialPaymentMethodCode = ""): FormState => ({
  phone: "",
  firstName: "",
  lastName: "",
  originCountryId: definitions.find((item) => item.type === "ORIGIN_COUNTRY" && item.code === "TR")?.id ?? "",
  originCityId: "",
  originDistrictId: "",
  paymentMethod: definitions.find((item) => item.type === "PAYMENT_METHOD" && item.code === initialPaymentMethodCode)?.code
    ?? definitions.find((item) => item.type === "PAYMENT_METHOD" && item.code === "CASH")?.code
    ?? "",
  type: definitions.find((item) => item.type === "DONATION_TYPE" && item.code === initialTypeCode)?.name ?? "",
  groupId: "",
  destinationCountryId: "",
  destinationRegionId: "",
  partnerId: "",
  unitCount: 1,
  unitType: definitions.find((item) => item.type === "UNIT_TYPE")?.name ?? "",
  unitPrice: "",
  amount: "",
  foreignAmount: "",
  proxyOwner: "",
  address: "",
  specialCondition: false,
  orderStatus: false,
  smsProvider: "TWILIO",
  sendMessage: true,
  sendWhatsapp: false,
  currencySms: false,
  description: "",
  receiptDate: new Date().toISOString().slice(0, 10),
  receiptNo: "",
  currencyCode: "TRY",
});

const fieldClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-100";
const phoneCountries = getCountries()
  .map((code) => ({ code, name: trLabels[code] ?? code, dial: `+${getCountryCallingCode(code)}` }))
  .sort((left, right) => left.name.localeCompare(right.name, "tr"));

function internationalPhone(country: Country, localValue: string) {
  const dial = `+${getCountryCallingCode(country)}`;
  const localDigits = localValue.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${localDigits}`;
}

export function DonationForm({
  modal = false,
  onClose,
  onSaved,
  initialDefinitions,
  initialTypeCode = "",
  initialPaymentMethodCode = "",
}: {
  modal?: boolean;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
  initialDefinitions?: GeneralDonationDefinition[];
  initialTypeCode?: string;
  initialPaymentMethodCode?: string;
}) {
  const [definitions, setDefinitions] = useState<GeneralDonationDefinition[]>(initialDefinitions ?? []);
  const [form, setForm] = useState<FormState>(() => initialState(initialDefinitions, initialTypeCode, initialPaymentMethodCode));
  const [phoneCountry, setPhoneCountry] = useState<Country>("TR");
  const [loading, setLoading] = useState(!initialDefinitions?.length);
  const [saving, setSaving] = useState(false);
  const [donorFound, setDonorFound] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDefinitions?.length) {
      const items = initialDefinitions;
      setDefinitions(items);
      setForm((current) => ({
        ...current,
        originCountryId: items.find((item) => item.type === "ORIGIN_COUNTRY" && item.code === "TR")?.id ?? "",
        paymentMethod: items.find((item) => item.type === "PAYMENT_METHOD" && item.code === initialPaymentMethodCode)?.code
          ?? items.find((item) => item.type === "PAYMENT_METHOD" && item.code === "CASH")?.code
          ?? "",
        type: items.find((item) => item.type === "DONATION_TYPE" && item.code === initialTypeCode)?.name ?? "",
        groupId: "",
        unitType: items.find((item) => item.type === "UNIT_TYPE")?.name ?? "",
      }));
      setLoading(false);
      return;
    }
    void fetch("/api/definitions")
      .then(async (response) => {
        const data = (await response.json()) as { definitions?: GeneralDonationDefinition[]; message?: string };
        if (!response.ok) throw new Error(data.message);
        const items = data.definitions ?? [];
        setDefinitions(items);
        setForm((current) => ({
          ...current,
          originCountryId: items.find((item) => item.type === "ORIGIN_COUNTRY" && item.code === "TR")?.id ?? "",
          paymentMethod: items.find((item) => item.type === "PAYMENT_METHOD" && item.code === initialPaymentMethodCode)?.code
            ?? items.find((item) => item.type === "PAYMENT_METHOD" && item.code === "CASH")?.code
            ?? "",
          type: items.find((item) => item.type === "DONATION_TYPE" && item.code === initialTypeCode)?.name ?? "",
          groupId: "",
          unitType: items.find((item) => item.type === "UNIT_TYPE")?.name ?? "",
        }));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Dinamik tanımlar yüklenemedi."))
      .finally(() => setLoading(false));
  }, [initialDefinitions, initialPaymentMethodCode, initialTypeCode]);

  useEffect(() => {
    const normalized = normalizePhone(internationalPhone(phoneCountry, form.phone));
    if (normalized.length < 12) {
      setDonorFound(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/donors/lookup?phone=${encodeURIComponent(normalized)}`)
        .then(async (response) => {
          if (!response.ok) return;
          const data = (await response.json()) as { donor: { name: string } | null };
          if (!data.donor) {
            setDonorFound(false);
            return;
          }
          const parts = data.donor.name.trim().split(/\s+/);
          const firstName = parts.shift() ?? "";
          setForm((current) => ({ ...current, firstName, lastName: parts.join(" ") }));
          setDonorFound(true);
        })
        .catch(() => setDonorFound(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.phone, phoneCountry]);

  const byType = (type: string) => definitions.filter((item) => item.type === type);
  const originCities = byType("ORIGIN_CITY").filter((item) => !form.originCountryId || item.parentId === form.originCountryId);
  const originDistricts = byType("ORIGIN_DISTRICT").filter((item) => !form.originCityId || item.parentId === form.originCityId);
  const selectedDonationType = byType("DONATION_TYPE").find((item) => item.name === form.type);
  const generalDonationGroups = byType("GENERAL_DONATION_GROUP").filter((item) => item.parentId === selectedDonationType?.id);
  const partners = byType("PARTNER").filter((item) => item.parentId === form.destinationCountryId);
  const regions = byType("DESTINATION_REGION").filter((item) =>
    !form.destinationCountryId ||
    !item.parentId ||
    item.parentId === form.destinationCountryId ||
    item.parentId === form.partnerId
  );
  const selected = (id: string) => definitions.find((item) => item.id === id);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => {
      if (field === "originCountryId") return { ...current, originCountryId: value as string, originCityId: "", originDistrictId: "" };
      if (field === "originCityId") return { ...current, originCityId: value as string, originDistrictId: "" };
      if (field === "destinationCountryId") return { ...current, destinationCountryId: value as string, partnerId: "", destinationRegionId: "" };
      if (field === "partnerId") {
        const partnerId = value as string;
        const selectedRegion = definitions.find((item) => item.id === current.destinationRegionId);
        const regionStillValid = !current.destinationRegionId
          || selectedRegion?.parentId === current.destinationCountryId
          || selectedRegion?.parentId === partnerId;
        return { ...current, partnerId, destinationRegionId: regionStillValid ? current.destinationRegionId : "" };
      }
      if (field === "type") return { ...current, type: value as string, groupId: "" };
      return { ...current, [field]: value };
    });
  }

  function changePhoneCountry(country: Country) {
    setPhoneCountry(country);
    const originCountry = definitions.find((item) => item.type === "ORIGIN_COUNTRY" && item.code === country);
    if (originCountry) update("originCountryId", originCountry.id);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.receiptNo.trim()) {
      setError("Telefon, ad, soyad ve makbuz numarası alanları zorunludur.");
      return;
    }
    if (!form.type || !form.paymentMethod || Number(form.amount) <= 0 || Number(form.unitCount) < 1) {
      setError("Bağış türü, ödeme yöntemi ve sıfırdan büyük tutar zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          donorName: `${form.firstName} ${form.lastName}`,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: internationalPhone(phoneCountry, form.phone),
          phoneCountry,
          originCountry: selected(form.originCountryId)?.name ?? null,
          originCity: selected(form.originCityId)?.name ?? null,
          originDistrict: selected(form.originDistrictId)?.name ?? null,
          type: form.type,
          groupId: form.groupId || null,
          destinationCountryId: form.destinationCountryId || null,
          destinationRegionId: form.destinationRegionId || null,
          partnerId: form.partnerId || null,
          paymentMethod: form.paymentMethod,
          quantity: Number(form.unitCount),
          unitType: form.unitType || null,
          unitPrice: form.unitPrice === "" ? null : Number(form.unitPrice),
          amount: Number(form.amount),
          foreignAmount: form.foreignAmount === "" ? null : Number(form.foreignAmount),
          proxyOwner: form.proxyOwner || null,
          address: form.address || null,
          specialCondition: form.specialCondition,
          orderStatus: form.orderStatus,
          smsProvider: form.smsProvider,
          sendSms: form.sendMessage,
          sendWhatsapp: form.sendWhatsapp,
          currencySms: form.currencySms,
          description: form.description,
          receiptDate: form.receiptDate,
          receiptNo: form.receiptNo,
          currency: form.currencyCode,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Genel bağış kaydedilemedi.");
      setSuccess("Genel bağış, ödeme, makbuz ve mesaj tercihleriyle birlikte kaydedildi.");
      setForm(initialState(definitions));
      setPhoneCountry("TR");
      await onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Genel bağış kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <form onSubmit={submit}>
      <Card className={`overflow-hidden ${modal ? "rounded-2xl border-0 shadow-2xl shadow-slate-950/30" : ""}`}>
        <div className="relative bg-[#126653] px-5 py-4 text-center text-white">
          <h3 className="font-bold uppercase tracking-wide">Genel Bağış Formu</h3>
          {modal && <button type="button" onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-white/15" aria-label="Kapat"><X className="size-5" /></button>}
        </div>
        {loading ? (
          <div className="flex justify-center gap-2 p-14 text-sm text-slate-500"><LoaderCircle className="size-5 animate-spin" /> Dinamik alanlar yükleniyor</div>
        ) : (
          <div className="general-donation-grid grid gap-4 p-5 sm:p-6 lg:grid-cols-4">
            <FormSelect label="Yıl" value={String(new Date(form.receiptDate).getFullYear())} options={[{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }]} disabled />
            <FormSelect label="Ay" value={String(new Date(form.receiptDate).getMonth() + 1)} options={["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map((label, index) => ({ value: String(index + 1), label }))} disabled />
            <FormField label="Tarih"><Input type="date" value={form.receiptDate} onChange={(event) => update("receiptDate", event.target.value)} className="h-10" /></FormField>
            <FormField label="Makbuz No" required><Input required value={form.receiptNo} onChange={(event) => update("receiptNo", event.target.value)} placeholder="Makbuz numarasını girin" className="h-10" /></FormField>

            <FormField label="Telefon" required><InternationalPhoneInput country={phoneCountry} onCountryChange={changePhoneCountry} value={form.phone} onChange={(value) => update("phone", value)} donorFound={donorFound} /></FormField>
            <FormField label="Adı" required><Input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className="h-10" /></FormField>
            <FormField label="Soyadı" required><Input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} className="h-10" /></FormField>
            <DynamicSelect label="Gelen Ülke" value={form.originCountryId} onChange={(value) => update("originCountryId", value)} items={byType("ORIGIN_COUNTRY")} />

            <DynamicSelect label="Gelen İl" value={form.originCityId} onChange={(value) => update("originCityId", value)} items={originCities} disabled={!form.originCountryId} />
            <DynamicSelect label="Gelen İlçe" value={form.originDistrictId} onChange={(value) => update("originDistrictId", value)} items={originDistricts} disabled={!form.originCityId} />
            <DynamicSelect label="Ödeme" value={form.paymentMethod} onChange={(value) => update("paymentMethod", value)} items={byType("PAYMENT_METHOD")} useCode required />
            <DynamicSelect label="Türü" value={form.type} onChange={(value) => update("type", value)} items={byType("DONATION_TYPE").filter((item) => item.code !== "KURBAN")} useName required />

            <DynamicSelect label="Grubu" value={form.groupId} onChange={(value) => update("groupId", value)} items={generalDonationGroups} disabled={!selectedDonationType} required />
            <DynamicSelect label="Giden Ülke" value={form.destinationCountryId} onChange={(value) => update("destinationCountryId", value)} items={byType("DESTINATION_COUNTRY")} />
            <DynamicSelect label="Partner" value={form.partnerId} onChange={(value) => update("partnerId", value)} items={partners} disabled={!form.destinationCountryId} />
            <DynamicSelect label="Giden Bölge (İl)" value={form.destinationRegionId} onChange={(value) => update("destinationRegionId", value)} items={regions} disabled={!form.destinationCountryId} />

            <FormField label="Birim Sayısı"><Input type="number" min="1" value={form.unitCount} onChange={(event) => update("unitCount", event.target.value === "" ? "" : Number(event.target.value))} className="h-10 bg-cyan-50" /></FormField>
            <DynamicSelect label="Birim Cinsi" value={form.unitType} onChange={(value) => update("unitType", value)} items={byType("UNIT_TYPE")} useName />
            <FormField label="Birim Fiyatı"><Input type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(event) => update("unitPrice", event.target.value === "" ? "" : Number(event.target.value))} className="h-10 bg-cyan-50" /></FormField>
            <FormField label="Tutar" required><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value === "" ? "" : Number(event.target.value))} className="h-10 bg-cyan-50 font-bold text-emerald-800" /></FormField>

            <FormField label="Döviz"><Input type="number" min="0" step="0.01" value={form.foreignAmount} onChange={(event) => update("foreignAmount", event.target.value === "" ? "" : Number(event.target.value))} className="h-10 bg-cyan-50" /></FormField>
            <FormSelect label="Para Birimi" value={form.currencyCode} onChange={(value) => update("currencyCode", value)} options={byType("CURRENCY").map((item) => ({ value: item.code, label: item.code === "TRY" ? "TL" : item.code === "USD" ? "$" : item.code === "EUR" ? "€" : item.code === "GBP" ? "Sterlin" : item.name }))} />
            <FormField label="Vekâlet Sahibi"><Input value={form.proxyOwner} onChange={(event) => update("proxyOwner", event.target.value)} className="h-10" /></FormField>
            <div className="grid gap-2">
              <CheckField label="Özel Şart" checked={form.specialCondition} onChange={(value) => update("specialCondition", value)} />
              <CheckField label="Sipariş Durumu" checked={form.orderStatus} onChange={(value) => update("orderStatus", value)} />
            </div>

            <FormField label="Adres" className="general-address lg:col-span-4"><textarea value={form.address} onChange={(event) => update("address", event.target.value)} className={`${fieldClass} min-h-16 py-2`} /></FormField>
            <FormSelect label="Mesaj Operatörü" value={form.smsProvider} onChange={(value) => update("smsProvider", value)} options={[{ value: "TWILIO", label: "Twilio SMS" }]} />
            <div className="general-message rounded-xl bg-emerald-50 p-3"><p className="mb-2 text-xs font-bold text-emerald-900">Mesaj</p><div className="general-message-options"><CheckField label="SMS Gönder" checked={form.sendMessage} onChange={(value) => update("sendMessage", value)} /><CheckField label="WhatsApp Gönder" checked={form.sendWhatsapp} onChange={(value) => update("sendWhatsapp", value)} /></div></div>
            <CheckField label="Döviz SMS Gönder" checked={form.currencySms} onChange={(value) => update("currencySms", value)} />
            <div />
            <FormField label="Açıklama" className="general-description lg:col-span-4"><textarea value={form.description} onChange={(event) => update("description", event.target.value)} className={`${fieldClass} min-h-20 py-2`} /></FormField>
          </div>
        )}
        {(success || error) && <div className="px-5 pb-4">{success ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check className="size-4" />{success}</p> : <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div>}
        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4">
          {modal && <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>}
          <Button type="submit" variant="success" disabled={saving || loading}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Genel Bağışı Kaydet</Button>
        </div>
      </Card>
    </form>
  );

  return modal ? <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"><div className="general-donation-compact max-h-[92vh] w-full max-w-[1120px] overflow-y-auto rounded-2xl xl:max-h-[90vh]">{content}</div></div> : content;
}

function FormField({ label, children, required = false, className = "" }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return <label className={`general-donation-field ${className}`}><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}{required && <b className="ml-1 text-red-500">*</b>}</span>{children}</label>;
}

function DynamicSelect({ label, value, onChange, items, disabled = false, required = false, useCode = false, useName = false }: { label: string; value: string; onChange: (value: string) => void; items: GeneralDonationDefinition[]; disabled?: boolean; required?: boolean; useCode?: boolean; useName?: boolean }) {
  return <FormField label={label} required={required}><select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required={required}><option value="">Seçiniz</option>{items.map((item) => <option key={item.id} value={useCode ? item.code : useName ? item.name : item.id}>{item.name}</option>)}</select></FormField>;
}

function FormSelect({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange?: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return <FormField label={label}><select className={fieldClass} value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="general-donation-check flex min-h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[11px] font-semibold text-slate-600"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-emerald-600" /><MessageCircle className="size-3.5 text-emerald-600" />{label}</label>;
}

function InternationalPhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  donorFound,
}: {
  country: Country;
  onCountryChange: (country: Country) => void;
  value: string;
  onChange: (value: string) => void;
  donorFound: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = phoneCountries.find((item) => item.code === country) ?? phoneCountries[0];
  const SelectedFlag = flags[country];
  const filtered = phoneCountries.filter((item) =>
    `${item.name} ${item.dial}`.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr"))
  );

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className="relative flex h-10 rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-w-[112px] items-center gap-2 rounded-l-lg border-r border-slate-200 px-2.5 text-xs" aria-label="Telefon ülkesini seç">
        <span className="w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-slate-900/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{SelectedFlag && <SelectedFlag title={selected.name} />}</span>
        <strong>{selected.dial}</strong>
        <ChevronDown className="ml-auto size-3.5 text-slate-400" />
      </button>
      <div className="relative min-w-0 flex-1">
        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d\s()-]/g, ""))}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Telefon numarası"
          className="h-full w-full bg-transparent pl-10 pr-16 text-xs outline-none"
        />
        {donorFound && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-emerald-50 px-1.5 py-1 text-[9px] font-semibold text-emerald-700">Kayıtlı</span>}
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+7px)] z-[130] w-[350px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ülke veya alan kodu ara" className="h-10 w-full rounded-lg bg-slate-50 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {filtered.map((item) => {
              const Flag = flags[item.code];
              return (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => {
                    onCountryChange(item.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50 ${item.code === country ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-700"}`}
                >
                  <span className="w-7 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-slate-900/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{Flag && <Flag title={item.name} />}</span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <strong className="text-slate-500">{item.dial}</strong>
                </button>
              );
            })}
            {!filtered.length && <p className="p-5 text-center text-xs text-slate-500">Eşleşen ülke bulunamadı.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
