import { useState, useEffect } from "react";
import { Loader2, ImageIcon, Send, Plus, X, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PexelsSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

interface PexelsPhoto {
  id: number;
  url: string;
  thumb: string;
  original: string;
  portrait: string;
  alt: string;
  photographer: string;
}

const QUICK_TAGS = ["Nature", "Food", "Travel", "Fashion", "Business", "Flowers", "Interior", "Abstract", "Texture", "Minimal"];

export const PexelsSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: PexelsSidebarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [curated, setCurated] = useState<PexelsPhoto[]>([]);
  const [curatedLoaded, setCuratedLoaded] = useState(false);

  // Load curated photos on first open
  useEffect(() => {
    if (activeTool === "pexels" && !curatedLoaded) {
      setCuratedLoaded(true);
      fetch("/api/pexels/curated")
        .then(r => r.json())
        .then(d => { if (d.data) setCurated(d.data); })
        .catch(() => {});
    }
  }, [activeTool, curatedLoaded]);

  const displayPhotos = results.length > 0 ? results : curated;

  const search = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/pexels/search?q=${encodeURIComponent(searchQuery)}&orientation=portrait`);
      const d = await r.json();
      if (r.ok) setResults(d.data || []);
      else toast.error(d.error || "Arama hatasi");
    } catch { toast.error("Pexels arama hatasi"); }
    finally { setLoading(false); }
  };

  const addToCanvas = (photo: PexelsPhoto) => {
    if (!editor) return;
    editor.addImage(photo.portrait || photo.original);
    toast.success("Gorsel canvas'a eklendi");
  };

  const onClose = () => onChangeActiveTool("select");

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "pexels" ? "visible" : "hidden",
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <ImageIcon className="size-4 text-teal-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Pexels</h2>
            <p className="text-[10px] text-gray-400">Ucretsiz stok fotograflar</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ara..."
              className="rounded-lg h-9 text-sm pl-8"
              onKeyDown={e => e.key === "Enter" && search()}
            />
          </div>
          <Button onClick={() => search()} disabled={loading || !query.trim()} className="bg-teal-600 hover:bg-teal-700 rounded-lg h-9 px-4 shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Ara"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => { setQuery(tag.toLowerCase()); search(tag.toLowerCase()); }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 hover:bg-teal-50 hover:text-teal-600 border border-gray-100 hover:border-teal-200 transition-all">
              {tag}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-teal-600" />
          </div>
        ) : displayPhotos.length > 0 ? (
          <div className="p-3 grid grid-cols-2 gap-2">
            {displayPhotos.map(p => (
              <button key={p.id} onClick={() => addToCanvas(p)}
                className="relative group rounded-lg overflow-hidden border border-gray-100 hover:border-teal-400 transition-all hover:shadow-md aspect-[3/4]">
                <img src={p.thumb} alt={p.alt} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className="size-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Plus className="size-4 text-teal-600" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 opacity-0 group-hover:opacity-100 transition-all">
                  <p className="text-[9px] text-white font-medium truncate">{p.photographer}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ImageIcon className="size-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Stok foto arayin</p>
            <p className="text-xs text-gray-300 mt-1">Tiklayin, direkt canvas&apos;a eklensin</p>
          </div>
        )}
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
