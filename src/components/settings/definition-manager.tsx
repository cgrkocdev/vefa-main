"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TYPES = [
  ["DEPARTMENT", "Bölümler"], ["YEAR", "Yıllar ve dönemler"], ["DONATION_TYPE", "Bağış türleri"],
  ["DONATION_GROUP", "Bağış grupları"], ["ORIGIN_COUNTRY", "Gelen ülkeler"], ["ORIGIN_CITY", "Gelen iller"],
  ["ORIGIN_DISTRICT", "Gelen ilçeler"], ["DESTINATION_COUNTRY", "Giden ülkeler"], ["DESTINATION_REGION", "Giden bölgeler"],
  ["PARTNER", "Partner kurumlar"], ["REPRESENTATIVE", "Temsilcilikler"], ["PAYMENT_METHOD", "Ödeme yöntemleri"],
  ["CURRENCY", "Para birimleri"], ["ORGANIZATION", "Dernek / kurumlar"], ["MESSAGE_TEMPLATE", "Mesaj şablonları"],
  ["PROJECT_STATUS", "Proje durumları"], ["SHARE_STATUS", "Hisse durumları"], ["UNIT_TYPE", "Birim cinsleri"],
  ["GENERAL_DONATION_GROUP", "Genel bağış grupları"],
] as const;

type DefinitionType = (typeof TYPES)[number][0];
type DefinitionItem = {
  id: string; type: DefinitionType; code: string; name: string; symbol: string | null;
  parentId: string | null; sortOrder: number; isActive: boolean;
};

export function DefinitionManager() {
  const [type, setType] = useState<DefinitionType>("DEPARTMENT");
  const [items, setItems] = useState<DefinitionItem[]>([]);
  const [parentItems, setParentItems] = useState<DefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DefinitionItem | "create" | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/definitions?type=${type}&includeInactive=true`);
      const data = (await response.json()) as { definitions?: DefinitionItem[]; message?: string };
      if (!response.ok) throw new Error(data.message);
      setItems(data.definitions ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tanımlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  const parentType = type === "ORIGIN_CITY"
      ? "ORIGIN_COUNTRY"
      : type === "ORIGIN_DISTRICT"
        ? "ORIGIN_CITY"
        : type === "PARTNER"
          ? "DESTINATION_COUNTRY"
        : type === "DESTINATION_REGION"
          ? "DESTINATION_COUNTRY"
        : type === "GENERAL_DONATION_GROUP"
          ? "DONATION_TYPE"
        : null;

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!parentType) return;
    void fetch(`/api/definitions?type=${parentType}`)
      .then((response) => response.json())
      .then((data: { definitions?: DefinitionItem[] }) => setParentItems(data.definitions ?? []))
      .catch(() => setParentItems([]));
  }, [parentType]);

  async function toggle(item: DefinitionItem) {
    const response = await fetch(`/api/definitions/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (response.ok) await load();
  }

  async function remove(item: DefinitionItem) {
    if (!window.confirm(`“${item.name}” tanımını silmek istediğinize emin misiniz? Bağlı kayıt varsa tanım pasife alınacaktır.`)) return;
    const response = await fetch(`/api/definitions/${item.id}`, { method: "DELETE" });
    const data = (await response.json()) as { message?: string };
    if (!response.ok) { setError(data.message ?? "Tanım silinemedi."); return; }
    await load();
  }

  return (
    <Card className="mx-auto mt-6 max-w-[1280px] overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h2 className="font-bold text-[#0b2b3c]">Dinamik tanımlar</h2><p className="mt-1 text-xs text-slate-500">Formlarda kullanılan seçenekleri, sıralamayı ve aktiflik durumunu yönetin.</p></div>
        <Button variant="success" onClick={() => setEditing("create")}><Plus className="size-4" /> Tanım ekle</Button>
      </div>
      <div className="grid lg:grid-cols-[250px_1fr]">
        <div className="border-b border-slate-100 p-3 lg:border-b-0 lg:border-r">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{TYPES.map(([value, label]) => <button key={value} onClick={() => setType(value)} className={`rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${type === value ? "bg-[#0b2b3c] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div>
        </div>
        <div className="min-w-0">
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-xs text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Yükleniyor</div>
            : error ? <p className="m-5 rounded-xl bg-red-50 p-4 text-xs text-red-700">{error}</p>
            : <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_100px_90px_92px] sm:items-center"><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-[10px] text-slate-400">{item.code}{item.symbol ? ` · ${item.symbol}` : ""}</p></div><span className="text-xs text-slate-500">Sıra: {item.sortOrder}</span><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.isActive ? "Aktif" : "Pasif"}</span><div className="flex gap-1"><button onClick={() => setEditing(item)} aria-label="Düzenle" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="size-4" /></button><button onClick={() => void toggle(item)} aria-label="Aktifliği değiştir" className="grid size-8 place-items-center rounded-lg text-amber-600 hover:bg-amber-50"><Power className="size-4" /></button><button onClick={() => void remove(item)} aria-label="Sil" className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button></div></div>)}{!items.length && <p className="p-12 text-center text-xs text-slate-500">Bu kategoride tanım bulunmuyor.</p>}</div>}
        </div>
      </div>
      {editing && <DefinitionModal type={type} item={editing === "create" ? null : editing} allItems={items} parentItems={parentItems} parentType={parentType} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
    </Card>
  );
}

function DefinitionModal({ type, item, allItems, parentItems, parentType, onClose, onSaved }: { type: DefinitionType; item: DefinitionItem | null; allItems: DefinitionItem[]; parentItems: DefinitionItem[]; parentType: string | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(item ? `/api/definitions/${item.id}` : "/api/definitions", {
      method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, code: form.get("code"), name: form.get("name"), symbol: form.get("symbol") || null, parentId: form.get("parentId") || null, sortOrder: Number(form.get("sortOrder")), isActive: form.get("isActive") === "on" }),
    });
    const data = (await response.json()) as { message?: string };
    if (!response.ok) { setError(data.message ?? "Tanım kaydedilemedi."); setSaving(false); return; }
    await onSaved();
  }
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><Card className="w-full max-w-md p-6"><div className="flex items-start justify-between"><div><h3 className="font-bold text-[#0b2b3c]">{item ? "Tanımı düzenle" : "Yeni tanım"}</h3><p className="mt-1 text-xs text-slate-500">{TYPES.find(([value]) => value === type)?.[1]}</p></div><button onClick={onClose}><X className="size-5 text-slate-400" /></button></div><form onSubmit={submit} className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-semibold">Kod</span><Input name="code" required defaultValue={item?.code} /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold">Ad</span><Input name="name" required defaultValue={item?.name} /></label>{parentType && <label className="block"><span className="mb-1.5 block text-xs font-semibold">Bağlı üst tanım</span><select name="parentId" required defaultValue={item?.parentId ?? ""} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Seçiniz</option>{parentItems.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>}<div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-semibold">Sembol</span><Input name="symbol" defaultValue={item?.symbol ?? ""} /></label><label><span className="mb-1.5 block text-xs font-semibold">Sıra</span><Input name="sortOrder" type="number" min="0" defaultValue={item?.sortOrder ?? allItems.length} /></label></div><label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold">Aktif<input name="isActive" type="checkbox" defaultChecked={item?.isActive ?? true} className="size-4 accent-emerald-600" /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<Button type="submit" variant="success" className="w-full" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <><Save className="size-4" /> Kaydet</>}</Button></form></Card></div>;
}
