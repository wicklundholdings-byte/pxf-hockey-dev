import { useState } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { usePlaybookFolders, type PlaybookFolderKind } from "@/hooks/usePlaybookFolders";

export function FolderManager({ kind, onClose }: { kind: PlaybookFolderKind; onClose: () => void }) {
  const { folders, create, rename, remove } = usePlaybookFolders(kind);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function add() {
    if (!newName.trim()) return;
    await create(newName);
    setNewName("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Folders</h3>
          <button onClick={onClose} className="text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New folder name"
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <button onClick={add} className="rounded-xl bg-teal px-3 text-xs font-bold text-black"><Plus size={14} /></button>
        </div>
        {folders.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No folders yet.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {folders.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                {editing === f.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none" />
                    <button onClick={async () => { await rename(f.id, editName); setEditing(null); }} className="text-teal"><Check size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-foreground">{f.name}</span>
                    <button onClick={() => { setEditing(f.id); setEditName(f.name); }} className="text-muted-foreground"><Pencil size={12} /></button>
                    <button onClick={() => { if (confirm(`Delete folder "${f.name}"?`)) remove(f.id); }} className="text-red-400"><Trash2 size={12} /></button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}