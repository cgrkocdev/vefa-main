"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bird, Check, ChevronDown, LoaderCircle, MessageCircle, Phone, Save, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SACRIFICE_KINDS, type SacrificeKind } from "@/lib/constants";
import { getCountries, getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import trLabels from "react-phone-number-input/locale/tr.json";
import { City, State } from "country-state-city";

type Sacrifice = {
  id: string;
  typeId: string;
  groupId: string;
  currencyId: string;
  number: number;
  name: string;
  country: string;
  partner: string;
  region: string;
  group: string;
  kind: SacrificeKind;
  sharePrice: number;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  shares: Array<{ shareNo: number; status: string }>;
};

const PHONE_COUNTRIES = getCountries()
  .map((code) => ({
    code,
    name: trLabels[code] ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }))
  .sort((first, second) => first.name.localeCompare(second.name, "tr"));

type PhoneCountryCode = Country;
type LocationDefinition = {
  id: string;
  type: "ORIGIN_COUNTRY" | "ORIGIN_CITY" | "ORIGIN_DISTRICT";
  code: string;
  name: string;
  parentId: string | null;
};
type FormDefinition = {
  id: string;
  type: string;
  code: string;
  name: string;
  parentId: string | null;
};

export type SacrificeDonationEditData = {
  donationId: string;
  projectId: string;
  projectName: string;
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
  kind: SacrificeKind;
  country: string;
  partner: string;
  paymentMethod: string;
  amount: number;
  description: string;
  quantity: number;
  receiptNo: string;
};

const fieldClass =
  "sacrifice-control h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";

export function SacrificeDonationForm({
  modal = false,
  onClose,
  onSaved,
  editData,
}: {
  modal?: boolean;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
  editData?: SacrificeDonationEditData;
}) {
  const [sacrifices, setSacrifices] = useState<Sacrifice[]>([]);
  const [kind, setKind] = useState<SacrificeKind>(editData?.kind ?? "VACIP");
  const [destinationCountry, setDestinationCountry] = useState(editData?.country ?? "");
  const [partner, setPartner] = useState(editData?.partner ?? "");
  const [sacrificeId, setSacrificeId] = useState(editData?.projectId ?? "");
  const [quantity, setQuantity] = useState(editData?.quantity ?? 1);
  const [amount, setAmount] = useState(editData ? String(editData.amount) : "");
  const [receiptNo, setReceiptNo] = useState(editData?.receiptNo ?? "");
  const [paymentMethod, setPaymentMethod] = useState(editData?.paymentMethod ?? "CASH");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [sendToProxy, setSendToProxy] = useState(false);
  const [sendCurrencySms, setSendCurrencySms] = useState(false);
  const initialPhoneCountry = (editData?.phoneCountry || "TR") as PhoneCountryCode;
  const initialDial = `+${getCountryCallingCode(initialPhoneCountry)}`;
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryCode>(initialPhoneCountry);
  const [phoneNumber, setPhoneNumber] = useState(editData?.phone.startsWith(initialDial) ? editData.phone.slice(initialDial.length) : editData?.phone ?? "");
  const [originStateCode, setOriginStateCode] = useState("");
  const [originCityName, setOriginCityName] = useState("");
  const [locationDefinitions, setLocationDefinitions] = useState<LocationDefinition[]>([]);
  const [formDefinitions, setFormDefinitions] = useState<FormDefinition[]>([]);
  const [proxyCountry, setProxyCountry] = useState<PhoneCountryCode>("TR");
  const [proxyPhone, setProxyPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/sacrifices")
      .then(async (response) => {
        if (!response.ok) throw new Error("Kurban projeleri yüklenemedi.");
        return response.json() as Promise<{ sacrifices?: Sacrifice[] }>;
      })
      .then((data) => {
        const items = data.sacrifices ?? [];
        setSacrifices(items);
        if (editData) return;
        const first = items.find((item) => item.kind === "VACIP" && item.status === "OPEN" && item.shares.some((share) => share.status === "EMPTY"));
        if (first) {
          setDestinationCountry(first.country);
          setPartner(first.partner);
          setSacrificeId(first.id);
          setAmount(String(first.sharePrice));
        }
      })
      .catch(() => setError("Kurban projeleri yüklenemedi."));
  }, [editData]);

  useEffect(() => {
    void Promise.all(
      ["DEPARTMENT", "PARTNER", "DESTINATION_COUNTRY", "PAYMENT_METHOD"].map(async (type) => {
        const response = await fetch(`/api/definitions?type=${type}`);
        if (!response.ok) return [];
        const data = (await response.json()) as { definitions?: FormDefinition[] };
        return data.definitions ?? [];
      }),
    ).then((groups) => setFormDefinitions(groups.flat()));
  }, []);

  useEffect(() => {
    void Promise.all(
      ["ORIGIN_COUNTRY", "ORIGIN_CITY", "ORIGIN_DISTRICT"].map(async (type) => {
        const response = await fetch(`/api/definitions?type=${type}`);
        if (!response.ok) return [];
        const data = (await response.json()) as { definitions?: LocationDefinition[] };
        return data.definitions ?? [];
      }),
    ).then((groups) => setLocationDefinitions(groups.flat()));
  }, []);

  const available = useMemo(
    () => sacrifices.filter((item) =>
      item.kind === kind &&
      (!destinationCountry || item.country === destinationCountry) &&
      (!partner || item.partner === partner) &&
      (item.id === editData?.projectId || (
        item.status === "OPEN" &&
        item.shares.some((share) => share.status === "EMPTY")
      )),
    ),
    [destinationCountry, editData?.projectId, kind, partner, sacrifices],
  );
  const matchingProjects = useMemo(
    () => sacrifices.filter((item) =>
      item.kind === kind &&
      (!destinationCountry || item.country === destinationCountry) &&
      (!partner || item.partner === partner) &&
      item.status !== "CANCELLED",
    ),
    [destinationCountry, kind, partner, sacrifices],
  );
  const selected = sacrifices.find((item) => item.id === sacrificeId) ?? available[0];
  const emptyShares = selected?.shares.filter((share) => share.status === "EMPTY") ?? [];
  const assignedShares = emptyShares.slice(0, quantity);
  const selectedCountryDefinition = formDefinitions.find(
    (item) => item.type === "DESTINATION_COUNTRY" && item.name === destinationCountry,
  );
  const availablePartners = formDefinitions.filter(
    (item) =>
      item.type === "PARTNER" &&
      Boolean(selectedCountryDefinition) &&
      item.parentId === selectedCountryDefinition?.id,
  );
  const originStates = useMemo(() => {
    const country = locationDefinitions.find((item) => item.type === "ORIGIN_COUNTRY" && item.code === phoneCountry);
    const managed = country
      ? locationDefinitions
          .filter((item) => item.type === "ORIGIN_CITY" && item.parentId === country.id)
          .map((item) => ({ isoCode: item.code.replace(`${phoneCountry}-`, ""), name: item.name }))
      : [];
    return managed.length ? managed : State.getStatesOfCountry(phoneCountry);
  }, [locationDefinitions, phoneCountry]);
  const originCities = useMemo(
    () => {
      if (!originStateCode) return [];
      const state = locationDefinitions.find((item) => item.type === "ORIGIN_CITY" && item.code === `${phoneCountry}-${originStateCode}`);
      const managed = state
        ? locationDefinitions
            .filter((item) => item.type === "ORIGIN_DISTRICT" && item.parentId === state.id)
            .map((item) => ({ name: item.name, latitude: undefined, longitude: undefined }))
        : [];
      return managed.length ? managed : City.getCitiesOfState(phoneCountry, originStateCode);
    },
    [locationDefinitions, originStateCode, phoneCountry],
  );

  useEffect(() => {
    if (!editData || originStateCode || !originStates.length) return;
    const state = originStates.find((item) => item.name === editData.city);
    if (state) {
      setOriginStateCode(state.isoCode);
      setOriginCityName(editData.district);
    }
  }, [editData, originStateCode, originStates]);

  function changeOriginCountry(country: PhoneCountryCode) {
    setPhoneCountry(country);
    setOriginStateCode("");
    setOriginCityName("");
  }

  function chooseProject(project: Sacrifice | undefined) {
    if (!project) return;
    setDestinationCountry(project.country);
    setPartner(project.partner);
    setSacrificeId(project.id);
    const emptyCount = project.shares.filter((share) => share.status === "EMPTY").length;
    setQuantity((current) => Math.min(current, Math.max(1, emptyCount)));
    setAmount(String(project.sharePrice));
  }

  function changeKind(nextKind: SacrificeKind) {
    setKind(nextKind);
    const next = sacrifices.find(
      (item) =>
        item.kind === nextKind &&
        (!destinationCountry || item.country === destinationCountry) &&
        (!partner || item.partner === partner) &&
        item.status === "OPEN" &&
        item.shares.some((share) => share.status === "EMPTY"),
    );
    if (next) chooseProject(next);
    else {
      setSacrificeId("");
      setAmount("");
    }
  }

  function changeDestinationCountry(country: string) {
    setDestinationCountry(country);
    const next = sacrifices.find(
      (item) =>
        item.kind === kind &&
        item.country === country &&
        item.status === "OPEN" &&
        item.shares.some((share) => share.status === "EMPTY"),
    );
    if (next) chooseProject(next);
    else {
      setSacrificeId("");
      setAmount("");
    }
  }

  function changePartner(nextPartner: string) {
    setPartner(nextPartner);
    const next = sacrifices.find(
      (item) =>
        item.kind === kind &&
        (!destinationCountry || item.country === destinationCountry) &&
        item.partner === nextPartner &&
        item.status === "OPEN" &&
        item.shares.some((share) => share.status === "EMPTY"),
    );
    if (next) chooseProject(next);
    else {
      setSacrificeId("");
      setAmount("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError("Uygun bir kurban projesi seçin.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Ödeme tutarı sıfırdan büyük olmalıdır.");
      return;
    }
    if (!receiptNo.trim()) {
      setError("Makbuz numarası zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const values = new FormData(event.currentTarget);
    const details = [
      `Bölüm: ${values.get("department")}`,
      `Gelen ülke: ${values.get("originCountry")}`,
      `Gelen il: ${values.get("originCity")}`,
      `Gelen ilçe: ${values.get("originDistrict")}`,
      `Partner: ${values.get("partner")}`,
      `Proje: ${values.get("projectName")}`,
      `Açıklama: ${values.get("description")}`,
    ].join(" · ");
    try {
      if (editData) {
        const response = await fetch(`/api/donations/${editData.donationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: String(values.get("firstName") ?? ""),
            lastName: String(values.get("lastName") ?? ""),
            phone: String(values.get("phone") ?? ""),
            phoneCountry,
            originCountry: String(values.get("originCountry") ?? "") || null,
            city: String(values.get("originCity") ?? "") || null,
            district: String(values.get("originDistrict") ?? "") || null,
            amount: numericAmount,
            paymentMethod,
            sacrificeId: selected.id,
            quantity,
            receiptNumber: receiptNo.trim(),
            date: values.get("date"),
            description: String(values.get("description") ?? ""),
          }),
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message);
      } else {
        const paymentDefinition = formDefinitions.find((item) => item.type === "PAYMENT_METHOD" && item.code === paymentMethod);
        if (!paymentDefinition) throw new Error("Geçerli bir ödeme şekli seçin.");
        if (assignedShares.length < quantity) throw new Error("Seçilen projede yeterli boş hisse bulunmuyor.");
        for (let index = 0; index < quantity; index += 1) {
          const response = await fetch("/api/sacrifice-donations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              donor: {
                firstName: String(values.get("firstName") ?? ""),
                lastName: String(values.get("lastName") ?? ""),
                phone: String(values.get("phone") ?? ""),
                phoneCountry,
                closePhone: sendToProxy ? String(values.get("proxyPhone") ?? "") || null : null,
                originCountry: String(values.get("originCountry") ?? "") || null,
                originCity: String(values.get("originCity") ?? "") || null,
                originDistrict: String(values.get("originDistrict") ?? "") || null,
              },
              projectId: selected.id,
              typeId: selected.typeId,
              groupId: selected.groupId,
              amount: numericAmount,
              foreignAmount: null,
              currencyId: selected.currencyId,
              paymentMethodId: paymentDefinition.id,
              receiptNumber: quantity === 1 ? receiptNo.trim() : `${receiptNo.trim()}-${index + 1}`,
              receiptDate: values.get("date"),
              description: details,
              messageTarget: sendToProxy ? "CLOSE" : "DONOR",
              sendSms: sendWhatsapp,
              sendWhatsapp: false,
              currencySms: sendCurrencySms,
            }),
          });
          const result = (await response.json()) as { message?: string };
          if (!response.ok) throw new Error(result.message ?? `${index + 1}. bağış kaydedilemedi.`);
        }
      }
      setSuccess(editData ? "Bağış kaydı ve bağlı veritabanı bilgileri güncellendi." : `${quantity} adet kurban bağışı başarıyla kaydedildi ve hisseler atandı.`);
      if (editData) {
        await onSaved?.();
        return;
      }
      event.currentTarget.reset();
      setSendWhatsapp(true);
      setSendToProxy(false);
      setSendCurrencySms(false);
      setPhoneNumber("");
      setReceiptNo("");
      setProxyPhone("");
      setOriginStateCode("");
      setOriginCityName("");
      const refreshed = await fetch("/api/sacrifices");
      const refreshedData = (await refreshed.json()) as { sacrifices?: Sacrifice[] };
      const refreshedItems = refreshedData.sacrifices ?? [];
      setSacrifices(refreshedItems);
      const refreshedProject = refreshedItems.find((item) => item.id === selected.id);
      if (refreshedProject) setAmount(String(refreshedProject.sharePrice));
      window.dispatchEvent(new CustomEvent("sacrifice-donation:created"));
      await onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bağış kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={modal ? "fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-slate-950/60 p-3 overscroll-none backdrop-blur-[2px] sm:p-5" : "mx-auto max-w-[1480px]"}
      onMouseDown={(event) => {
        if (modal && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={modal ? "sacrifice-modal-compact max-h-[92vh] w-full max-w-[1120px] overscroll-contain overflow-y-auto rounded-2xl shadow-2xl shadow-slate-950/30 xl:max-h-[90vh] xl:overflow-visible" : ""}>
      {!modal && <div className="mb-6 flex items-start gap-3">
        <Link href="/kurbanlar/bagis" aria-label="Kurban bağışlarına dön" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft className="size-4" /></Link>
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700"><Bird className="size-4" /> Kurban yönetimi</div>
          <h2 className="mt-1 text-xl font-bold text-[#0b2b3c]">Kurban bağış formu</h2>
          <p className="mt-1 text-sm text-slate-500">Bağışçı, proje, ödeme ve vekâlet bilgilerini doldurun.</p>
        </div>
      </div>}

      <form onSubmit={submit}>
        <Card className={modal ? "overflow-hidden rounded-2xl border-0 shadow-none" : "overflow-hidden"}>
          <div className={modal ? "sticky top-0 z-10 flex items-center justify-between bg-[#ff8a00] px-5 py-4 text-white sm:px-6" : "border-b border-emerald-700/20 bg-[#02b3aa] px-5 py-4 text-white sm:px-6"}>
            <div className={modal ? "w-full text-center" : ""}>
              <h3 className="font-bold uppercase tracking-wide">{editData ? "Kurban Bağış Kaydını Güncelle" : "Kurban Bağış Formu"}</h3>
              {!modal && <p className="mt-1 text-xs text-emerald-50/80">Zorunlu alanları doldurarak bağış kaydını tamamlayın.</p>}
            </div>
            {modal && <button type="button" onClick={onClose} aria-label="Formu kapat" className="absolute right-4 grid size-9 place-items-center rounded-lg text-white/90 hover:bg-white/15 hover:text-white"><X className="size-5" /></button>}
          </div>

          <div className="sacrifice-form-grid grid gap-6 p-5 sm:p-6 xl:grid-cols-3">
            <FormSection title="Bağışçı bilgileri">
              <Field label="Telefon" required>
                <InternationalPhoneField
                  name="phone"
                  country={phoneCountry}
                  onCountryChange={changeOriginCountry}
                  value={phoneNumber}
                  onValueChange={setPhoneNumber}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Bağışçı adı" required><Input name="firstName" defaultValue={editData?.firstName} required className="h-11" /></Field>
                <Field label="Bağışçı soyadı" required><Input name="lastName" defaultValue={editData?.lastName} required className="h-11" /></Field>
              </div>
              <Field label="Gelen ülke">
                <Select
                  name="originCountry"
                  value={PHONE_COUNTRIES.find((item) => item.code === phoneCountry)?.name}
                  onChange={(event) => {
                    const country = PHONE_COUNTRIES.find((item) => item.name === event.target.value);
                    if (country) changeOriginCountry(country.code);
                  }}
                >
                  {PHONE_COUNTRIES.map((country) => <option key={country.code} value={country.name}>{country.name} ({country.dial})</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Gelen il">
                  <input
                    type="hidden"
                    name="originCity"
                    value={originStates.find((state) => state.isoCode === originStateCode)?.name ?? ""}
                  />
                  <Select
                    value={originStateCode}
                    onChange={(event) => {
                      setOriginStateCode(event.target.value);
                      setOriginCityName("");
                    }}
                    disabled={!originStates.length}
                  >
                    <option value="">{originStates.length ? "İl seçiniz" : "İl bilgisi bulunamadı"}</option>
                    {originStates.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
                  </Select>
                </Field>
                <Field label="Gelen ilçe">
                  <Select
                    name="originDistrict"
                    value={originCityName}
                    onChange={(event) => setOriginCityName(event.target.value)}
                    disabled={!originStateCode || !originCities.length}
                  >
                    <option value="">{originStateCode ? (originCities.length ? "İlçe seçiniz" : "İlçe bilgisi bulunamadı") : "Önce il seçiniz"}</option>
                    {originCities.map((city) => <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>{city.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Yıl"><Select name="year" defaultValue={new Date().getFullYear()}>{[2026, 2025, 2024].map((year) => <option key={year}>{year}</option>)}</Select></Field>
                <Field label="Ay"><Select name="month" defaultValue={new Date().getMonth() + 1}>{["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</Select></Field>
              </div>
            </FormSection>

            <FormSection title="Kurban ve proje bilgileri">
              <Field label="Bölüm"><Select name="department" defaultValue="Büyükbaş Kurban">{formDefinitions.filter((item) => item.type === "DEPARTMENT").map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tür"><Select name="type" value="Kurban" onChange={() => undefined}><option>Kurban</option></Select></Field>
                <Field label="Grubu"><Select value={kind} onChange={(event) => changeKind(event.target.value as SacrificeKind)}>{SACRIFICE_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Giden ülke">
                  <Select
                    name="destination"
                    value={destinationCountry}
                    onChange={(event) => changeDestinationCountry(event.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {formDefinitions
                      .filter((item) => item.type === "DESTINATION_COUNTRY")
                      .map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  </Select>
                </Field>
                <Field label="Partner">
                  <Select
                    name="partner"
                    value={partner}
                    onChange={(event) => changePartner(event.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {availablePartners
                      .map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Giden bölge"><Select name="destinationRegion" value={selected?.region ?? ""} onChange={(event) => chooseProject(available.find((option) => option.region === event.target.value))}><option value="">Seçiniz</option>{[...new Set(available.map((item) => item.region))].map((region) => <option key={region}>{region}</option>)}</Select></Field>
                <Field label="Proje adı">
                  <Select
                    name="projectName"
                    value={selected?.id ?? ""}
                    onChange={(event) => chooseProject(available.find((item) => item.id === event.target.value))}
                  >
                    <option value="">Proje seçiniz</option>
                    {matchingProjects.map((item) => {
                      const filled = item.shares.filter((share) => share.status === "FILLED").length;
                      const capacity = item.shares.length;
                      const selectable = item.id === editData?.projectId ||
                        item.status === "OPEN" &&
                        item.shares.some((share) => share.status === "EMPTY");
                      return (
                        <option key={item.id} value={item.id} disabled={!selectable}>
                          {item.number} | {item.group} | {item.country} | {item.partner || "—"} | {item.region || "—"} | [{filled}/{capacity}]
                        </option>
                      );
                    })}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Ödeme şekli">
                  <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="">Seçiniz</option>
                    {formDefinitions
                      .filter((item) => item.type === "PAYMENT_METHOD")
                      .map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
                  </Select>
                </Field>
                <Field label="Adet">
                  <Select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={value} disabled={!editData && value > emptyShares.length}>{value}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kurban grup">
                  <Select
                    value={selected?.id ?? ""}
                    onChange={(event) => chooseProject(matchingProjects.find((item) => item.id === event.target.value))}
                  >
                    <option value="">Seçiniz</option>
                    {matchingProjects.map((item) => {
                      const hasEmptyShare = item.id === editData?.projectId || (item.status === "OPEN" && item.shares.some((share) => share.status === "EMPTY"));
                      return <option key={item.id} value={item.id} disabled={!hasEmptyShare}>{item.number}</option>;
                    })}
                  </Select>
                </Field>
              </div>
              <Field label="Hisse"><div className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{editData ? <><span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white">{editData.shareNo}</span><span className="text-xs text-slate-600">Mevcut hisse; proje değişirse uygun boş hisse atanır</span></> : <><span className="flex flex-wrap gap-1">{assignedShares.length ? assignedShares.map((share) => <span key={share.shareNo} className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white">{share.shareNo}</span>) : <span className="grid size-7 place-items-center rounded-lg bg-slate-300 text-xs font-bold text-white">—</span>}</span><span className="text-xs text-slate-600">{assignedShares.length ? `${assignedShares.length} boş hisse otomatik atanacak` : "Boş hisse bulunamadı"}</span></>}</div></Field>
            </FormSection>

            <FormSection title="Ödeme ve iletişim">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Tutar"><Input name="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 bg-emerald-50 font-bold text-emerald-800" /></Field>
                <Field label="Döviz"><Input value="0" readOnly className="h-11 bg-slate-50" /></Field>
                <Field label="Birim"><Select value="TRY" onChange={() => undefined}><option value="TRY">TL</option></Select></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Makbuz No" required><Input value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} required placeholder="Makbuz numarasını girin" className="h-11" /></Field>
                <Field label="Tarih"><Input name="date" type="date" defaultValue={editData?.date ? editData.date.slice(0, 10) : new Date().toISOString().slice(0, 10)} className="h-11" /></Field>
              </div>
              <Field label="Açıklama"><textarea name="description" defaultValue={editData?.description} className={`${fieldClass} min-h-24 resize-none py-3`} placeholder="Bağışa ilişkin açıklama..." /></Field>
              <Field label="Vekâlet telefonu">
                <InternationalPhoneField
                  name="proxyPhone"
                  country={proxyCountry}
                  onCountryChange={setProxyCountry}
                  value={proxyPhone}
                  onValueChange={setProxyPhone}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-[1fr_130px_130px]">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <input type="checkbox" checked={sendToProxy} onChange={(event) => setSendToProxy(event.target.checked)} className="size-4 accent-emerald-600" />
                  <span className="text-[11px] font-semibold text-slate-600">Mesaj bu telefona gitsin</span>
                </label>
                <Field label="SMS servisi"><Select name="smsProvider" defaultValue="TWILIO"><option value="TWILIO">Twilio SMS</option></Select></Field>
                <Field label="SMS bildirimi">
                  <Select
                    value={sendWhatsapp ? "SEND" : "SKIP"}
                    onChange={(event) => setSendWhatsapp(event.target.value === "SEND")}
                  >
                    <option value="SEND">Twilio SMS gönder</option>
                    <option value="SKIP">Gönderme</option>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field label="Mesaj / döviz tutarı"><Input name="smsAmount" defaultValue="0" inputMode="decimal" className="h-11 border-amber-200 bg-amber-50 font-semibold" /></Field>
                <label className="flex cursor-pointer items-end gap-2 pb-3">
                  <input type="checkbox" checked={sendCurrencySms} onChange={(event) => setSendCurrencySms(event.target.checked)} className="size-4 accent-emerald-600" />
                  <span className="whitespace-nowrap text-[11px] font-semibold text-slate-600">Döviz SMS</span>
                </label>
              </div>
              <div className={modal ? "grid grid-cols-[1fr_auto_auto] items-stretch gap-2 pt-1" : ""}>
                <div className={modal ? "flex min-w-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3" : "flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"}>
                  <MessageCircle className="size-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold text-emerald-900">{sendWhatsapp ? "Twilio SMS gönderilecek" : "SMS gönderilmeyecek"}</span>{!modal && <span className="mt-0.5 block text-[10px] text-emerald-700">Tercihi yukarıdaki SMS bildirimi alanından değiştirebilirsin.</span>}</span>
                </div>
                {modal && <>
                  <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">İptal</button>
                  <Button type="submit" variant="success" className="h-10 whitespace-nowrap px-3 text-xs" disabled={saving || !selected}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <><Save className="size-4" /> {editData ? "Güncelle" : "Bağışı Kaydet"}</>}</Button>
                </>}
              </div>
            </FormSection>
          </div>

          {(success || error) && <div className={modal ? "sticky bottom-0 z-20 px-5 pb-3 sm:px-6" : "px-5 pb-5 sm:px-6"}>{success ? <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-lg"><Check className="size-5 shrink-0" /> {success}</div> : <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}</div>}
          {!modal && <div className="sacrifice-form-footer flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Link href="/kurbanlar/bagis" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Vazgeç</Link>
            <Button type="submit" variant="success" className="min-w-40" disabled={saving || !selected}>{saving ? <><LoaderCircle className="size-4 animate-spin" /> Kaydediliyor</> : <><Save className="size-4" /> Bağışı Kaydet</>}</Button>
          </div>}
        </Card>
      </form>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="sacrifice-form-section space-y-4"><div className="sacrifice-section-title border-b border-slate-100 pb-3"><h4 className="text-sm font-bold text-[#0b2b3c]">{title}</h4></div>{children}</section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="sacrifice-field-label mb-1.5 block text-[11px] font-semibold text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{children}</label>;
}

function Select({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClass} ${className}`} {...props}>{children}</select>;
}

function InternationalPhoneField({
  name,
  country,
  onCountryChange,
  value,
  onValueChange,
  required = false,
}: {
  name: string;
  country: PhoneCountryCode;
  onCountryChange: (value: PhoneCountryCode) => void;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}) {
  const selected = PHONE_COUNTRIES.find((item) => item.code === country) ?? PHONE_COUNTRIES[0];
  const localDigits = value.replace(/\D/g, "");
  const dialDigits = selected.dial.replace(/\D/g, "");
  const withoutRepeatedDial = localDigits.startsWith(dialDigits) ? localDigits.slice(dialDigits.length) : localDigits;
  const internationalValue = `${selected.dial}${withoutRepeatedDial.replace(/^0+/, "")}`;

  return (
    <div className="sacrifice-control relative flex h-11 rounded-xl border border-slate-200 bg-white transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50">
      <input type="hidden" name={name} value={internationalValue} />
      <CountryPicker country={country} onChange={onCountryChange} />
      <div className="relative min-w-0 flex-1">
        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          required={required}
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => onValueChange(event.target.value.replace(/[^\d\s()-]/g, ""))}
          placeholder="Telefon numarası"
          className="h-full w-full bg-transparent pl-10 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

function CountryPicker({
  country,
  onChange,
}: {
  country: PhoneCountryCode;
  onChange: (value: PhoneCountryCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = PHONE_COUNTRIES.find((item) => item.code === country) ?? PHONE_COUNTRIES[0];
  const SelectedFlag = flags[country];
  const filtered = PHONE_COUNTRIES.filter((item) =>
    `${item.name} ${item.dial}`.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")),
  );

  useEffect(() => {
    function closePicker(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  return (
    <div ref={pickerRef} className="relative shrink-0 border-r border-slate-200">
      <button
        type="button"
        aria-label="Telefon ülkesini seç"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-full min-w-[112px] items-center gap-2 rounded-l-xl px-3 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span className="w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-slate-900/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
          {SelectedFlag && <SelectedFlag title={selected.name} />}
        </span>
        <span className="font-semibold">{selected.dial}</span>
        <ChevronDown className="ml-auto size-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[330px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ülke veya alan kodu ara"
              className="h-10 w-full rounded-lg bg-slate-50 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {filtered.map((item) => {
              const Flag = flags[item.code];
              return (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-emerald-50 ${item.code === country ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-700"}`}
                >
                  <span className="w-7 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-slate-900/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
                    {Flag && <Flag title={item.name} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 font-semibold text-slate-500">{item.dial}</span>
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
