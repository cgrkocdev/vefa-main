"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Definition = {
  id: string;
  type: string;
  name: string;
  code: string;
  parentId: string | null;
  symbol: string | null;
};
type Share = {
  id: string;
  shareNumber: number;
  status: "EMPTY" | "RESERVED" | "FILLED" | "CANCELLED";
};
type Project = {
  id: string;
  yearId: string;
  departmentId: string;
  typeId: string;
  groupId: string;
  destinationCountryId: string;
  partnerId: string | null;
  destinationRegionId: string | null;
  projectNumber: number;
  name: string;
  animalType: string;
  shareCapacity: number;
  sharePrice: string;
  currencyId: string;
  isVirtual: boolean;
  status: string;
  description: string | null;
  shares: Share[];
};
type Pagination = { page: number; pageSize: number; total: number; pageCount: number };
type SortKey =
  | "projectNumber"
  | "year"
  | "department"
  | "type"
  | "country"
  | "partner"
  | "region"
  | "capacity"
  | "shareStatus"
  | "virtual"
  | "name";

const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  OPEN: "Açık",
  FULL: "Dolu",
  COMPLETED: "Tamamlandı",
  CLOSED: "Kapalı",
  CANCELLED: "İptal",
};

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function projectOccupancy(project: Project) {
  const filled = project.shares.filter((share) => share.status === "FILLED").length;
  const reserved = project.shares.filter((share) => share.status === "RESERVED").length;
  return { filled, reserved, empty: project.shareCapacity - filled - reserved };
}

function shareStatus(project: Project) {
  const { filled, reserved } = projectOccupancy(project);
  if (filled >= project.shareCapacity || project.status === "FULL") return "DOLU";
  if (reserved > 0) return "REZERVE";
  if (filled > 0) return "KISMİ DOLU";
  return "BOŞ";
}

function printProject(project: Project, names: Map<string, Definition>) {
  const popup = window.open("", `project-${project.id}`, "width=1000,height=850");
  if (!popup) {
    window.alert("Yazdırma penceresi açılamadı. Açılır pencerelere izin verin.");
    return;
  }
  const occupancy = projectOccupancy(project);
  const rows = project.shares.map((share) => `<tr><td>${share.shareNumber}. hisse</td><td>${share.status === "FILLED" ? "Dolu" : share.status === "RESERVED" ? "Rezerve" : "Boş"}</td></tr>`).join("");
  popup.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(project.name)}</title>
  <style>
  @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8eeed;color:#12303c;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .tools{display:flex;justify-content:space-between;padding:13px 20px;background:#092d3c;color:white}.tools button{border:0;border-radius:8px;background:#09a477;color:white;padding:9px 16px;font-weight:bold}
  .sheet{position:relative;width:210mm;height:297mm;margin:18px auto;background:white;overflow:hidden;padding:16mm;box-shadow:0 18px 50px #092d3c24}.sheet:before{content:"";position:absolute;inset:0 0 auto;height:8px;background:linear-gradient(90deg,#02b3aa,#02b3aa,#f59e0b)}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce7e5;padding-bottom:8mm}.brand{display:flex;align-items:center;gap:12px}.logo{width:52px;height:52px;object-fit:contain}.brand h1{margin:0;font-size:24px}.brand p{margin:3px 0;color:#71838c;font-size:9px;letter-spacing:2px}.doc{text-align:right}.doc strong{display:block;color:#027f79}.doc span{font-size:11px;color:#71838c}
  h2{margin:9mm 0 2mm;font-size:27px}.subtitle{margin:0 0 7mm;color:#71838c;font-size:12px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.box{border:1px solid #dce7e5;border-radius:13px;overflow:hidden}.box h3{margin:0;padding:4mm;background:#edf8f5;color:#08745e;font-size:11px;text-transform:uppercase}.rows{padding:2mm 5mm}.row{display:flex;justify-content:space-between;gap:10px;padding:3mm 0;border-bottom:1px dashed #dce7e5;font-size:11px}.row:last-child{border:0}.row span{color:#71838c}.row strong{text-align:right}
  .capacity{margin:6mm 0;padding:5mm;border-radius:13px;background:linear-gradient(135deg,#092f3f,#0d5663);color:white}.capacity-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm}.metric small{display:block;color:#b9d8dc;font-size:9px}.metric strong{display:block;margin-top:5px;font-size:20px}
  table{width:100%;border-collapse:collapse;font-size:11px}th{background:#02b3aa;color:white;padding:9px;text-align:left}td{padding:8px 9px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f4faf8}.footer{position:absolute;right:16mm;bottom:11mm;left:16mm;display:flex;justify-content:space-between;border-top:1px solid #dce7e5;padding-top:4mm;color:#71838c;font-size:9px}
  @media print{html,body{width:210mm;height:297mm;overflow:hidden;background:white}.tools{display:none}.sheet{margin:0;box-shadow:none;break-inside:avoid}}
  </style></head><body><div class="tools"><strong>Yedirenk Derneği · Proje Yazdırma Önizlemesi</strong><button onclick="window.print()">Yazdır / PDF</button></div>
  <main class="sheet"><header><div class="brand"><img class="logo" src="/yedirenk-logo.png" alt="Yedirenk Derneği"><div><h1>Yedirenk</h1><p>BAĞIŞ YÖNETİMİ</p></div></div><div class="doc"><strong>KURBAN PROJE BELGESİ</strong><span>Proje No: ${project.projectNumber}</span></div></header>
  <h2>${escapeHtml(project.name)}</h2><p class="subtitle">Kurban proje planlama ve hisse durum belgesi</p>
  <div class="hero"><section class="box"><h3>Proje Tanımları</h3><div class="rows">
  <div class="row"><span>Yıl / Bölüm</span><strong>${escapeHtml(names.get(project.yearId)?.name ?? "—")} / ${escapeHtml(names.get(project.departmentId)?.name ?? "—")}</strong></div>
  <div class="row"><span>Tür / Grup</span><strong>${escapeHtml(names.get(project.typeId)?.name ?? "—")} / ${escapeHtml(names.get(project.groupId)?.name ?? "—")}</strong></div>
  <div class="row"><span>Proje tipi</span><strong>${project.isVirtual ? "Sanal" : "Gerçek"}</strong></div></div></section>
  <section class="box"><h3>Uygulama Bölgesi</h3><div class="rows">
  <div class="row"><span>Giden ülke</span><strong>${escapeHtml(names.get(project.destinationCountryId)?.name ?? "—")}</strong></div>
  <div class="row"><span>Partner</span><strong>${escapeHtml(names.get(project.partnerId ?? "")?.name ?? "—")}</strong></div>
  <div class="row"><span>Giden bölge</span><strong>${escapeHtml(names.get(project.destinationRegionId ?? "")?.name ?? "—")}</strong></div></div></section></div>
  <section class="capacity"><div class="capacity-grid"><div class="metric"><small>HİSSE FİYATI</small><strong>${Number(project.sharePrice).toLocaleString("tr-TR")} ${escapeHtml(names.get(project.currencyId)?.symbol ?? "₺")}</strong></div><div class="metric"><small>KAPASİTE</small><strong>${project.shareCapacity}</strong></div><div class="metric"><small>DOLU HİSSE</small><strong>${occupancy.filled}</strong></div><div class="metric"><small>BOŞ HİSSE</small><strong>${occupancy.empty}</strong></div></div></section>
  <table><thead><tr><th>Hisse</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table>
  <footer class="footer"><span>Bu belge Yedirenk Bağış Yönetim Sistemi tarafından oluşturulmuştur.</span><strong>${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date())}</strong></footer></main>
  <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));<\/script></body></html>`);
  popup.document.close();
  popup.focus();
}

export function ProjectPlanner() {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, pageCount: 1 });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [modal, setModal] = useState<Project | "create" | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "projectNumber", direction: "asc" });
  const names = useMemo(() => new Map(definitions.map((item) => [item.id, item])), [definitions]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const [definitionsResponse, projectsResponse] = await Promise.all([
        fetch("/api/definitions"),
        fetch(`/api/projects?page=${page}&pageSize=50&q=${encodeURIComponent(query)}`),
      ]);
      const definitionData = (await definitionsResponse.json()) as { definitions?: Definition[]; message?: string };
      const projectData = (await projectsResponse.json()) as { projects?: Project[]; pagination?: Pagination; message?: string };
      if (!definitionsResponse.ok || !projectsResponse.ok) throw new Error(definitionData.message ?? projectData.message);
      setDefinitions(definitionData.definitions ?? []);
      setProjects(projectData.projects ?? []);
      setPagination(projectData.pagination ?? { page, pageSize: 50, total: 0, pageCount: 1 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Projeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sortedProjects = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    const value = (project: Project): string | number => {
      const values: Record<SortKey, string | number> = {
        projectNumber: project.projectNumber,
        year: names.get(project.yearId)?.name ?? "",
        department: names.get(project.departmentId)?.name ?? "",
        type: names.get(project.typeId)?.name ?? "",
        country: names.get(project.destinationCountryId)?.name ?? "",
        partner: names.get(project.partnerId ?? "")?.name ?? "",
        region: names.get(project.destinationRegionId ?? "")?.name ?? "",
        capacity: project.shareCapacity,
        shareStatus: shareStatus(project),
        virtual: project.isVirtual ? "Sanal" : "Gerçek",
        name: project.name,
      };
      return values[sort.key];
    };
    return [...projects].sort((left, right) => {
      const leftValue = value(left);
      const rightValue = value(right);
      if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), "tr", { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [names, projects, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  async function archive(project: Project) {
    if (!window.confirm(`“${project.name}” projesi silinsin mi? Dolu veya rezerve hissesi bulunan projeler veri bütünlüğü gereği silinemez.`)) return;
    setDeletingId(project.id);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Proje silinemedi.");
      await load(pagination.page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Proje silinemedi.");
    } finally {
      setDeletingId("");
    }
  }

  function exportCsv() {
    const rows = [
      ["Proje No", "Yıl", "Bölüm", "Tür", "Giden Ülke", "Partner", "Giden Bölge", "Hisse", "Hisse Durumu", "Sanal Durumu", "Proje Adı"],
      ...sortedProjects.map((item) => [
        String(item.projectNumber),
        names.get(item.yearId)?.name ?? "",
        names.get(item.departmentId)?.name ?? "",
        names.get(item.typeId)?.name ?? "",
        names.get(item.destinationCountryId)?.name ?? "",
        names.get(item.partnerId ?? "")?.name ?? "",
        names.get(item.destinationRegionId ?? "")?.name ?? "",
        String(item.shareCapacity),
        shareStatus(item),
        item.isVirtual ? "SANAL" : "GERÇEK",
        item.name,
      ]),
    ];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(";")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kurban-projeleri.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b2b3c]">Kurban projesi planlama</h2>
          <p className="mt-1 text-sm text-slate-500">Projeleri, hisse kapasitesini ve çalışma durumunu yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!projects.length}><Download className="size-4" /> CSV</Button>
          <Button variant="success" onClick={() => setModal("create")}><Plus className="size-4" /> Proje oluştur</Button>
        </div>
      </div>

      <Card className="mb-5 p-4">
        <form onSubmit={(event) => { event.preventDefault(); void load(1); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pl-9" placeholder="Proje adı veya numarası ara" />
          </div>
          <Button size="sm">Ara</Button>
        </form>
      </Card>

      {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">{error}</p>}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center gap-2 p-12 text-xs text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Yükleniyor</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1780px] text-left">
                <thead className="bg-[#02b3aa] text-[10px] uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-3 py-3">Güncelle</th>
                    <th className="px-3 py-3">Yazdır</th>
                    <th className="px-3 py-3">Sil</th>
                    <ProjectSortHeader label="Proj. No" sortKey="projectNumber" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Yıl" sortKey="year" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Bölüm" sortKey="department" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Tür" sortKey="type" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Gid. Ülke" sortKey="country" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Partner" sortKey="partner" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Gid. Bölge" sortKey="region" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Hisse" sortKey="capacity" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Hisse Durumu" sortKey="shareStatus" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Sanal Durumu" sortKey="virtual" sort={sort} onSort={toggleSort} />
                    <ProjectSortHeader label="Prj. Adı" sortKey="name" sort={sort} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedProjects.map((project, index) => {
                    const occupancy = projectOccupancy(project);
                    const projectShareStatus = shareStatus(project);
                    return (
                      <tr key={project.id} className={`${index % 2 ? "bg-slate-50/80" : "bg-white"} text-xs text-slate-700 hover:bg-emerald-50/60`}>
                        <td className="px-3 py-3"><Button size="sm" variant="success" onClick={() => setModal(project)}><Pencil className="size-3.5" /> Güncelle</Button></td>
                        <td className="px-3 py-3"><Button size="sm" variant="outline" onClick={() => printProject(project, names)}><Printer className="size-3.5" /> Yazdır</Button></td>
                        <td className="px-3 py-3"><Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={deletingId === project.id} onClick={() => void archive(project)}>{deletingId === project.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Sil</Button></td>
                        <td className="px-3 py-3 font-bold text-[#0b2b3c]">{project.projectNumber}</td>
                        <td className="px-3 py-3">{names.get(project.yearId)?.name ?? "—"}</td>
                        <td className="px-3 py-3">{names.get(project.departmentId)?.name ?? "—"}</td>
                        <td className="px-3 py-3 font-semibold">{names.get(project.typeId)?.name ?? "—"}</td>
                        <td className="px-3 py-3">{names.get(project.destinationCountryId)?.name ?? "—"}</td>
                        <td className="px-3 py-3">{names.get(project.partnerId ?? "")?.name ?? "—"}</td>
                        <td className="px-3 py-3">{names.get(project.destinationRegionId ?? "")?.name ?? "—"}</td>
                        <td className="px-3 py-3"><strong>{project.shareCapacity}</strong><span className="ml-1 text-[10px] text-slate-400">({occupancy.filled} dolu)</span></td>
                        <td className="px-3 py-3"><span className={`font-bold ${projectShareStatus === "DOLU" ? "text-red-600" : projectShareStatus === "BOŞ" ? "text-emerald-700" : "text-amber-600"}`}>{projectShareStatus}</span></td>
                        <td className="px-3 py-3"><span className={`font-bold ${project.isVirtual ? "text-blue-700" : "text-slate-600"}`}>{project.isVirtual ? "SANAL" : "GERÇEK"}</span></td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{project.name}</td>
                      </tr>
                    );
                  })}
                  {!sortedProjects.length && <tr><td colSpan={14} className="p-14 text-center text-sm text-slate-500">Proje kaydı bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-slate-500">
              <span>{pagination.total} proje</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => void load(pagination.page - 1)}>Önceki</Button>
                <span className="px-2">{pagination.page}/{Math.max(1, pagination.pageCount)}</span>
                <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pageCount} onClick={() => void load(pagination.page + 1)}>Sonraki</Button>
              </div>
            </div>
          </>
        )}
      </Card>
      {modal && (
        <ProjectModal
          project={modal === "create" ? null : modal}
          projects={projects}
          definitions={definitions}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load(pagination.page);
          }}
        />
      )}
    </div>
  );
}

function ProjectSortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th className="whitespace-nowrap px-2 py-2">
      <button type="button" onClick={() => onSort(sortKey)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-white/15">
        {label}
        {active ? (sort.direction === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ArrowDownUp className="size-3 opacity-60" />}
      </button>
    </th>
  );
}

function ProjectModal({
  project,
  projects,
  definitions,
  onClose,
  onSaved,
}: {
  project: Project | null;
  projects: Project[];
  definitions: Definition[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [animalType, setAnimalType] = useState(project?.animalType ?? "CATTLE");
  const [sharePrice, setSharePrice] = useState(project?.sharePrice ?? "");
  const [countryId, setCountryId] = useState(project?.destinationCountryId ?? "");
  const [departmentId, setDepartmentId] = useState(project?.departmentId ?? "");
  const [yearId, setYearId] = useState(project?.yearId ?? "");
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [nextProjectNumber, setNextProjectNumber] = useState<number | null>(project?.projectNumber ?? null);
  const [partnerId, setPartnerId] = useState(project?.partnerId ?? "");
  const [regionId, setRegionId] = useState(project?.destinationRegionId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const byType = (type: string) => definitions.filter((item) => item.type === type);

  useEffect(() => {
    if (project) return;
    const country = definitions.find((item) => item.id === countryId)?.name ?? "";
    const department = definitions.find((item) => item.id === departmentId)?.name ?? "";
    setProjectName([country, department].filter(Boolean).join(" "));
  }, [countryId, definitions, departmentId, project]);

  useEffect(() => {
    if (project) return;
    if (!yearId || !departmentId || !countryId || !regionId) {
      setNextProjectNumber(null);
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/projects?nextNumberYearId=${encodeURIComponent(yearId)}&nextNumberDepartmentId=${encodeURIComponent(departmentId)}&nextNumberCountryId=${encodeURIComponent(countryId)}&nextNumberRegionId=${encodeURIComponent(regionId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sıradaki proje numarası alınamadı.");
        return response.json() as Promise<{ nextProjectNumber: number }>;
      })
      .then((data) => setNextProjectNumber(data.nextProjectNumber))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setNextProjectNumber(null);
      });
    return () => controller.abort();
  }, [countryId, departmentId, project, regionId, yearId]);

  function suggestSharePrice(form: HTMLFormElement, changedField: string) {
    if (project || !["departmentId", "typeId", "groupId", "destinationCountryId", "partnerId", "destinationRegionId"].includes(changedField)) return;
    const values = new FormData(form);
    const matching = projects
      .filter((item) =>
        (!values.get("departmentId") || item.departmentId === values.get("departmentId")) &&
        (!values.get("typeId") || item.typeId === values.get("typeId")) &&
        (!values.get("groupId") || item.groupId === values.get("groupId")) &&
        (!values.get("destinationCountryId") || item.destinationCountryId === values.get("destinationCountryId")) &&
        (!values.get("partnerId") || item.partnerId === values.get("partnerId")) &&
        (!values.get("destinationRegionId") || item.destinationRegionId === values.get("destinationRegionId"))
      )
      .sort((left, right) => right.projectNumber - left.projectNumber);
    if (matching[0]) setSharePrice(matching[0].sharePrice);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const automaticCurrency = project?.currencyId ?? byType("CURRENCY").find((item) => item.code === "TRY")?.id ?? byType("CURRENCY")[0]?.id;
    if (!automaticCurrency) {
      setError("Sistemde aktif para birimi tanımı bulunamadı.");
      setSaving(false);
      return;
    }
    const payload = {
      yearId: form.get("yearId"),
      departmentId: form.get("departmentId"),
      typeId: form.get("typeId"),
      groupId: form.get("groupId"),
      destinationCountryId: form.get("destinationCountryId"),
      partnerId: form.get("partnerId") || null,
      destinationRegionId: form.get("destinationRegionId") || null,
      ...(project ? { projectNumber: project.projectNumber } : {}),
      name: projectName,
      animalType,
      shareCapacity: animalType === "CATTLE" ? 7 : 1,
      sharePrice: Number(sharePrice),
      currencyId: automaticCurrency,
      isVirtual: form.get("isVirtual") === "on",
      status: form.get("status"),
      description: form.get("description") || null,
    };
    try {
      const response = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Proje kaydedilemedi.");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Proje kaydedilemedi.");
      setSaving(false);
    }
  }

  const definitionFields: Array<[string, string, string, string | null | undefined]> = [
    ["Yıl", "yearId", "YEAR", project?.yearId],
    ["Bölüm", "departmentId", "DEPARTMENT", project?.departmentId],
    ["Tür", "typeId", "DONATION_TYPE", project?.typeId],
    ["Bağış grubu", "groupId", "DONATION_GROUP", project?.groupId],
  ];
  const availablePartners = byType("PARTNER").filter((item) => item.parentId === countryId);
  const availableRegions = byType("DESTINATION_REGION").filter((item) => item.parentId === countryId || item.parentId === partnerId);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <Card className="max-h-[94vh] w-full max-w-3xl overflow-auto p-5 sm:p-6">
        <div className="flex justify-between">
          <div><h3 className="font-bold text-[#0b2b3c]">{project ? "Projeyi düzenle" : "Yeni kurban projesi"}</h3><p className="mt-1 text-xs text-slate-500">Proje alanları aktif tanımlardan gelir.</p></div>
          <button type="button" onClick={onClose}><X className="size-5 text-slate-400" /></button>
        </div>
        <form
          onSubmit={submit}
          onChange={(event) => suggestSharePrice(event.currentTarget, (event.target as HTMLElement).getAttribute("name") ?? "")}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {definitionFields.map(([label, name, type, value]) => name === "departmentId" ? (
            <label key={name}><span className="mb-1.5 block text-xs font-semibold">{label}</span><select name={name} required value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Seçiniz</option>{byType(type).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          ) : name === "yearId" ? (
            <label key={name}><span className="mb-1.5 block text-xs font-semibold">{label}</span><select name={name} required value={yearId} onChange={(event) => setYearId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Seçiniz</option>{byType(type).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          ) : (
            <label key={name}><span className="mb-1.5 block text-xs font-semibold">{label}</span><DefinitionSelect definitions={definitions} name={name} type={type} defaultValue={value} required={!["partnerId", "destinationRegionId"].includes(name)} /></label>
          ))}
          <label><span className="mb-1.5 block text-xs font-semibold">Giden ülke</span><select name="destinationCountryId" required value={countryId} onChange={(event) => { setCountryId(event.target.value); setPartnerId(""); setRegionId(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Seçiniz</option>{byType("DESTINATION_COUNTRY").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Partner</span><select name="partnerId" value={partnerId} onChange={(event) => { const nextPartnerId = event.target.value; const selectedRegion = definitions.find((item) => item.id === regionId); setPartnerId(nextPartnerId); if (regionId && selectedRegion?.parentId !== countryId && selectedRegion?.parentId !== nextPartnerId) setRegionId(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Seçiniz</option>{availablePartners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Giden bölge</span><select name="destinationRegionId" required value={regionId} onChange={(event) => setRegionId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Seçiniz</option>{availableRegions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Proje numarası</span><Input value={project?.projectNumber ?? nextProjectNumber ?? "Yıl, bölüm, ülke ve bölge seçiniz"} readOnly className="h-10 bg-slate-50 font-semibold text-emerald-700" /><span className="mt-1 block text-[10px] text-emerald-700">Yıl, bölüm, giden ülke ve bölgeye göre otomatik belirlenir.</span></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold">Proje adı</span><Input name="name" required value={projectName} onChange={(event) => setProjectName(event.target.value)} className="h-10" /><span className="mt-1 block text-[10px] text-emerald-700">Giden ülke ve bölüm seçildiğinde otomatik oluşturulur; gerekirse düzenlenebilir.</span></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Hayvan türü</span><select value={animalType} onChange={(event) => setAnimalType(event.target.value)} disabled={Boolean(project)} className="h-10 w-full rounded-xl border px-3 text-xs"><option value="CATTLE">Büyükbaş (7 hisse)</option><option value="SMALL_ANIMAL">Küçükbaş (1 hisse)</option></select></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Hisse fiyatı</span><Input name="sharePrice" type="number" min="0.01" step="0.01" required value={sharePrice} onChange={(event) => setSharePrice(event.target.value)} className="h-10" /><span className="mt-1 block text-[10px] text-emerald-700">{project ? "Kayıtlı fiyat gösteriliyor." : "Benzer en güncel projeden otomatik gelir; gerekirse değiştirebilirsiniz."}</span></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Durum</span><select name="status" defaultValue={project?.status ?? "DRAFT"} className="h-10 w-full rounded-xl border px-3 text-xs">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold">Sanal proje<input name="isVirtual" type="checkbox" defaultChecked={project?.isVirtual} /></label>
          <label className="sm:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-xs font-semibold">Açıklama</span><textarea name="description" defaultValue={project?.description ?? ""} className="min-h-20 w-full rounded-xl border p-3 text-xs" /></label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 sm:col-span-2 lg:col-span-3">{error}</p>}
          <Button variant="success" disabled={saving} className="sm:col-span-2 lg:col-span-3">{saving ? <LoaderCircle className="size-4 animate-spin" /> : "Projeyi kaydet"}</Button>
        </form>
      </Card>
    </div>
  );
}

function DefinitionSelect({
  definitions,
  name,
  type,
  defaultValue,
  required = true,
}: {
  definitions: Definition[];
  name: string;
  type: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <select name={name} required={required} defaultValue={defaultValue ?? ""} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
      <option value="">Seçiniz</option>
      {definitions.filter((item) => item.type === type).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  );
}
