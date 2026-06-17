import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, BarChart3, Wrench, Heart, Layers, ChevronRight, FolderPlus, Folder, Pencil, Trash2, Check, X, Plus, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { DRILLS, type Drill } from "@/data/pxf";
import { useFavorites, type Folder as FolderType } from "@/hooks/useFavorites";

export const Route = createFileRoute("/favourites")({
  head: () => ({
    meta: [
      { title: "Favourites — PXF Hockey" },
      { name: "description", content: "Your saved drills, ready to train." },
      { property: "og:title", content: "Favourites — PXF Hockey" },
      { property: "og:description", content: "Your saved drills, ready to train." },
    ],
  }),
  component: Favourites,
});

function Favourites() {
  const {
    ids, toggle, folders, foldersForDrill,
    createFolder, renameFolder, deleteFolder, toggleDrillFolder,
  } = useFavorites();
  const [activeFolder, setActiveFolder] = useState<string | "all" | "unfiled">("all");
  const [manageOpen, setManageOpen] = useState(false);
  const [pickerDrillId, setPickerDrillId] = useState<string | null>(null);

  const saved = useMemo(() => DRILLS.filter((d) => ids.includes(d.id)), [ids]);

  const filtered = useMemo(() => {
    if (activeFolder === "all") return saved;
    if (activeFolder === "unfiled") return saved.filter((d) => foldersForDrill(d.id).length === 0);
    return saved.filter((d) => foldersForDrill(d.id).includes(activeFolder));
  }, [saved, activeFolder, foldersForDrill]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: saved.length, unfiled: 0 };
    for (const f of folders) map[f.id] = 0;
    for (const d of saved) {
      const fs = foldersForDrill(d.id);
      if (fs.length === 0) map.unfiled += 1;
      for (const fid of fs) if (fid in map) map[fid] += 1;
    }
    return map;
  }, [saved, folders, foldersForDrill]);

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">SAVED</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Favourites</h1>
          <p className="mt-1 text-xs text-muted-foreground">Drills you've bookmarked for quick access.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-[11px] font-bold text-teal">
          <Heart size={12} fill="currentColor" /> {saved.length}
        </span>
      </div>

      {saved.length > 0 && (
        <>
          <div className="mt-5 -mx-5 overflow-x-auto px-5 pb-1">
            <div className="flex items-center gap-2">
              <FolderTab label="All" count={counts.all} active={activeFolder === "all"} onClick={() => setActiveFolder("all")} />
              {folders.map((f) => (
                <FolderTab key={f.id} label={f.name} count={counts[f.id] ?? 0} active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)} />
              ))}
              <FolderTab label="Unfiled" count={counts.unfiled} active={activeFolder === "unfiled"} onClick={() => setActiveFolder("unfiled")} muted />
              <button
                onClick={() => setManageOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-teal/50 bg-teal/5 px-3 py-1.5 text-[11px] font-bold text-teal"
              >
                <FolderPlus size={12} /> MANAGE
              </button>
            </div>
          </div>
        </>
      )}

      {saved.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border/60 bg-surface p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal">
            <Heart size={22} />
          </div>
          <h2 className="mt-4 text-base font-bold text-foreground">No favourites yet</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tap the heart on any drill to save it here.</p>
          <Link to="/drills" className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal">
            BROWSE DRILLS
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-surface p-6 text-center">
          <FolderOpen size={22} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">Nothing in this folder yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap the folder icon on a drill to add it here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((d) => (
            <FavoriteDrillCard
              key={d.id}
              d={d}
              folderLabels={foldersForDrill(d.id).map((fid) => folders.find((f) => f.id === fid)?.name).filter(Boolean) as string[]}
              onUnfavorite={() => toggle(d.id)}
              onOpenFolders={() => setPickerDrillId(d.id)}
            />
          ))}
        </div>
      )}

      {manageOpen && (
        <ManageFoldersSheet
          folders={folders}
          counts={counts}
          onClose={() => setManageOpen(false)}
          onCreate={(name) => createFolder(name)}
          onRename={(id, name) => renameFolder(id, name)}
          onDelete={(id) => {
            deleteFolder(id);
            if (activeFolder === id) setActiveFolder("all");
          }}
        />
      )}

      {pickerDrillId && (
        <FolderPickerSheet
          drill={DRILLS.find((d) => d.id === pickerDrillId)!}
          folders={folders}
          selected={foldersForDrill(pickerDrillId)}
          onToggle={(fid) => toggleDrillFolder(pickerDrillId, fid)}
          onCreate={(name) => {
            const f = createFolder(name);
            if (f) toggleDrillFolder(pickerDrillId, f.id);
          }}
          onClose={() => setPickerDrillId(null)}
        />
      )}
    </div>
  );
}

function FolderTab({ label, count, active, onClick, muted }: { label: string; count: number; active: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors " +
        (active
          ? "border-teal bg-teal/20 text-teal"
          : muted
          ? "border-border/60 bg-surface-2 text-muted-foreground"
          : "border-border/60 bg-surface text-foreground/80")
      }
    >
      <Folder size={12} />
      <span className="uppercase">{label}</span>
      <span className={"rounded-full px-1.5 text-[10px] " + (active ? "bg-teal/30 text-teal" : "bg-background/60 text-muted-foreground")}>{count}</span>
    </button>
  );
}

function FavoriteDrillCard({ d, folderLabels, onUnfavorite, onOpenFolders }: { d: Drill; folderLabels: string[]; onUnfavorite: () => void; onOpenFolders: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface transition-colors hover:border-teal/40">
      <Link to="/drill-detail/$drillId" params={{ drillId: d.id }} className="flex w-full gap-3 p-3">
        <div className="relative grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-2 to-background">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 30% 35%, #00E5D6 0, transparent 55%), radial-gradient(circle at 75% 75%, #39FF14 0, transparent 60%)" }} />
          <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
            <Play size={15} fill="currentColor" />
          </div>
          <span className="absolute bottom-1 left-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-volt backdrop-blur">L{d.level}</span>
        </div>
        <div className="min-w-0 flex-1 pr-20">
          <p className="text-[10px] font-semibold tracking-wider text-teal">{d.category.toUpperCase()}</p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-foreground">{d.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><BarChart3 size={11} className="text-teal" /> {d.difficulty}</span>
            <span className="flex items-center gap-1"><Layers size={11} className="text-volt" /> Level {d.level}</span>
            <span className="flex items-center gap-1"><Wrench size={11} /> {d.equipment.length} items</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {folderLabels.length > 0 ? (
              folderLabels.map((label) => (
                <span key={label} className="flex items-center gap-1 rounded-full border border-volt/30 bg-volt/10 px-2 py-0.5 text-[10px] font-bold text-volt">
                  <Folder size={9} /> {label}
                </span>
              ))
            ) : (
              d.equipment.slice(0, 3).map((e) => (
                <span key={e} className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{e}</span>
              ))
            )}
          </div>
        </div>
        <ChevronRight size={16} className="self-center text-muted-foreground" />
      </Link>
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          onClick={onUnfavorite}
          aria-label="Remove from favourites"
          className="grid h-8 w-8 place-items-center rounded-full border border-teal/40 bg-teal/15 text-teal transition-colors hover:bg-teal/25"
        >
          <Heart size={14} fill="currentColor" />
        </button>
        <button
          onClick={onOpenFolders}
          aria-label="Add to folder"
          className="grid h-8 w-8 place-items-center rounded-full border border-volt/40 bg-volt/15 text-volt transition-colors hover:bg-volt/25"
        >
          <FolderPlus size={14} />
        </button>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border/60 bg-surface p-5 shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-[0.2em] text-foreground">{title.toUpperCase()}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ManageFoldersSheet({
  folders, counts, onClose, onCreate, onRename, onDelete,
}: {
  folders: FolderType[];
  counts: Record<string, number>;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const suggestions = ["U11 Skating", "Puck Control", "Friday PEP", "Tryout Prep", "GameIQ", "Dryland", "Shooting"]
    .filter((s) => !folders.some((f) => f.name.toLowerCase() === s.toLowerCase()));

  return (
    <Sheet title="Manage Folders" onClose={onClose}>
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { onCreate(newName); setNewName(""); } }}
          placeholder="New folder name"
          className="flex-1 rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
        />
        <button
          onClick={() => { if (newName.trim()) { onCreate(newName); setNewName(""); } }}
          className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow-teal"
          aria-label="Create folder"
        >
          <Plus size={16} />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">QUICK ADD</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onCreate(s)}
                className="rounded-full border border-border/60 bg-surface-2 px-3 py-1 text-[11px] font-semibold text-foreground/80 hover:border-teal/50 hover:text-teal"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {folders.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No folders yet. Create one above.</p>
        ) : (
          folders.map((f) => {
            const isEditing = editingId === f.id;
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5">
                <Folder size={14} className="text-volt" />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editName.trim()) { onRename(f.id, editName); setEditingId(null); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-teal/50 bg-background px-2 py-1 text-sm text-foreground focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">{f.name}</span>
                )}
                <span className="rounded-full bg-background/60 px-1.5 text-[10px] font-bold text-muted-foreground">{counts[f.id] ?? 0}</span>
                {isEditing ? (
                  <button onClick={() => { if (editName.trim()) { onRename(f.id, editName); setEditingId(null); } }} aria-label="Save" className="grid h-7 w-7 place-items-center rounded-md text-teal hover:bg-teal/10">
                    <Check size={14} />
                  </button>
                ) : (
                  <button onClick={() => { setEditingId(f.id); setEditName(f.name); }} aria-label="Rename" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground">
                    <Pencil size={13} />
                  </button>
                )}
                <button onClick={() => { if (confirm(`Delete folder "${f.name}"? Saved drills will remain in Favourites.`)) onDelete(f.id); }} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
}

function FolderPickerSheet({
  drill, folders, selected, onToggle, onCreate, onClose,
}: {
  drill: Drill;
  folders: FolderType[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  return (
    <Sheet title={`Add to folder`} onClose={onClose}>
      <p className="text-xs text-muted-foreground">
        Organize <span className="font-semibold text-foreground">{drill.name}</span>. A drill can live in multiple folders.
      </p>

      <div className="mt-4 space-y-2">
        {folders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-surface-2 px-3 py-4 text-center text-xs text-muted-foreground">
            No folders yet — create one below.
          </p>
        ) : (
          folders.map((f) => {
            const on = selected.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => onToggle(f.id)}
                className={"flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors " + (on ? "border-teal bg-teal/15" : "border-border/60 bg-surface-2 hover:border-teal/40")}
              >
                <Folder size={14} className={on ? "text-teal" : "text-volt"} />
                <span className={"flex-1 truncate text-sm font-semibold " + (on ? "text-teal" : "text-foreground")}>{f.name}</span>
                {on && <Check size={14} className="text-teal" />}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">NEW FOLDER</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { onCreate(newName); setNewName(""); } }}
            placeholder="e.g. Tryout Prep"
            className="flex-1 rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          />
          <button
            onClick={() => { if (newName.trim()) { onCreate(newName); setNewName(""); } }}
            className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow-teal"
            aria-label="Create and add"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gradient-brand py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal">
        DONE
      </button>
    </Sheet>
  );
}