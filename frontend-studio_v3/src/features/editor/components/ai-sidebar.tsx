import { useState } from "react";
import { Loader2, Sparkles, ImageIcon, Type, Wand2, Palette, LayoutTemplate, ChevronRight, RefreshCw, Plus, Zap } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";

import { useGenerateImage } from "@/features/ai/api/use-generate-image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type AiTab = "image" | "text" | "pin" | "style";

const PIN_STYLES = [
  { id: "minimal", label: "Minimal", colors: ["#ffffff", "#000000"], font: "Inter" },
  { id: "bold", label: "Bold", colors: ["#E60023", "#ffffff"], font: "Bebas Neue" },
  { id: "elegant", label: "Elegant", colors: ["#1a1a2e", "#e2d1c3"], font: "Playfair Display" },
  { id: "nature", label: "Nature", colors: ["#2d6a4f", "#d8f3dc"], font: "Lato" },
  { id: "modern", label: "Modern", colors: ["#6c5ce7", "#ffffff"], font: "Poppins" },
  { id: "warm", label: "Warm", colors: ["#ff6b35", "#fff8f0"], font: "Montserrat" },
  { id: "dark", label: "Dark", colors: ["#0f0f0f", "#f0c040"], font: "Oswald" },
  { id: "pastel", label: "Pastel", colors: ["#fce4ec", "#5c374c"], font: "Quicksand" },
];

const ASPECT_RATIOS = [
  { id: "2:3", label: "2:3 Pin", w: 1000, h: 1500 },
  { id: "1:1", label: "Kare", w: 1000, h: 1000 },
  { id: "9:16", label: "Story", w: 1080, h: 1920 },
  { id: "1:2.1", label: "Uzun Pin", w: 1000, h: 2100 },
];

const TEXT_PROMPTS = [
  { label: "Urun Tanitimi", prompt: "Kisa ve etkileyici bir urun tanitim metni yaz" },
  { label: "Motivasyon", prompt: "Ilham verici bir motivasyon cumlesi yaz" },
  { label: "Ipucu / Bilgi", prompt: "Kisa ve faydali bir ipucu veya bilgi yaz" },
  { label: "CTA (Eylem)", prompt: "Eyleme gecirici bir cagri metni yaz" },
  { label: "Baslik", prompt: "Dikkat cekici kisa bir baslik yaz" },
  { label: "Alt Baslik", prompt: "Aciklayici kisa bir alt baslik yaz" },
];

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: AiSidebarProps) => {
  const mutation = useGenerateImage();

  const [aiTab, setAiTab] = useState<AiTab>("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageRatio, setImageRatio] = useState("2:3");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Text AI
  const [textTopic, setTextTopic] = useState("");
  const [textType, setTextType] = useState("");
  const [textResult, setTextResult] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  // Pin designer
  const [pinTopic, setPinTopic] = useState("");
  const [pinStyle, setPinStyle] = useState("minimal");
  const [pinLoading, setPinLoading] = useState(false);

  // Style transfer
  const [stylePrompt, setStylePrompt] = useState("");
  const [styleLoading, setStyleLoading] = useState(false);

  const onGenerateImage = () => {
    if (!imagePrompt.trim()) return;

    const ratio = ASPECT_RATIOS.find(r => r.id === imageRatio);
    const aspectStr = imageRatio === "1:2.1" ? "2:3" : imageRatio;

    mutation.mutate({ prompt: imagePrompt, aspect_ratio: aspectStr as "1:1" | "3:2" | "2:3" | "4:5" | "5:4" | "16:9" | "9:16" }, {
      onSuccess: ({ data }) => {
        setGeneratedImages(prev => [data, ...prev].slice(0, 8));
        editor?.addImage(data);
      }
    });
  };

  const addImageToCanvas = (url: string) => {
    editor?.addImage(url);
  };

  const generateAiText = async () => {
    if (!textTopic.trim()) return;
    setTextLoading(true);
    try {
      const selectedType = TEXT_PROMPTS.find(t => t.label === textType);
      const systemPrompt = selectedType
        ? `${selectedType.prompt}. Konu: "${textTopic}". Sadece metni yaz, baska bir sey ekleme. Kisa ve oz olsun (max 2-3 cumle). Turkce yaz.`
        : `Su konu hakkinda kisa bir metin yaz: "${textTopic}". Sadece metni yaz, baska bir sey ekleme. Kisa ve oz olsun. Turkce yaz.`;

      const r = await fetch("/api/ai/canvas-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt }),
      });
      const d = await r.json();
      if (d.data?.text) {
        setTextResult(d.data.text);
      } else {
        setTextResult(textTopic);
      }
    } catch {
      setTextResult(textTopic);
    }
    setTextLoading(false);
  };

  const addTextToCanvas = (text: string, options?: { fontSize?: number; fontWeight?: number; fontFamily?: string; fill?: string; textAlign?: string }) => {
    if (!editor || !text) return;
    editor.addText(text, {
      fontSize: options?.fontSize || 32,
      fontWeight: options?.fontWeight || 400,
      fontFamily: options?.fontFamily || "Inter",
      fill: options?.fill || "#000000",
      textAlign: options?.textAlign || "center",
      width: 600,
      left: 200,
      top: 200,
    });
  };

  const generateAiPin = async () => {
    if (!pinTopic.trim() || !editor) return;
    setPinLoading(true);
    const style = PIN_STYLES.find(s => s.id === pinStyle) || PIN_STYLES[0];

    try {
      // 1. Change canvas background
      editor.changeBackground(style.colors[0]);

      // 2. Generate AI text for the pin
      const r = await fetch("/api/ai/canvas-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `"${pinTopic}" konusu icin bir Pinterest pin tasarimi icin su metinleri yaz: 1) Dikkat cekici kisa baslik (max 8 kelime) 2) Kisa aciklama (max 15 kelime) 3) CTA metni (max 4 kelime). JSON formatinda cevap ver: {"title":"...","subtitle":"...","cta":"..."}. Turkce yaz.`
        }),
      });
      const d = await r.json();
      let title = pinTopic;
      let subtitle = "";
      let cta = "Daha Fazlasi";

      if (d.data?.text) {
        try {
          const jsonMatch = d.data.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            title = parsed.title || title;
            subtitle = parsed.subtitle || "";
            cta = parsed.cta || cta;
          }
        } catch {
          title = d.data.text.slice(0, 60);
        }
      }

      // 3. Add title text
      editor.addText(title, {
        fontSize: 64,
        fontWeight: 700,
        fontFamily: style.font,
        fill: style.colors[1],
        textAlign: "center",
        width: 800,
        left: 100,
        top: 400,
      });

      // 4. Add subtitle
      if (subtitle) {
        editor.addText(subtitle, {
          fontSize: 28,
          fontWeight: 400,
          fontFamily: style.font,
          fill: style.colors[1] + "cc",
          textAlign: "center",
          width: 700,
          left: 150,
          top: 600,
        });
      }

      // 5. Add CTA button-like text
      if (cta) {
        editor.addText(cta, {
          fontSize: 24,
          fontWeight: 600,
          fontFamily: style.font,
          fill: style.colors[0],
          textAlign: "center",
          width: 300,
          left: 350,
          top: 900,
          backgroundColor: style.colors[1],
        });
      }

    } catch {}
    setPinLoading(false);
  };

  const applyStyleToCanvas = async () => {
    if (!editor || !stylePrompt.trim()) return;
    setStyleLoading(true);
    try {
      const r = await fetch("/api/ai/canvas-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `"${stylePrompt}" tarzinda bir tasarim icin su bilgileri JSON olarak ver: {"bgColor":"#hex","textColor":"#hex","accentColor":"#hex","font":"font ismi"}. Sadece JSON cevap ver.`
        }),
      });
      const d = await r.json();
      if (d.data?.text) {
        const jsonMatch = d.data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.bgColor) editor.changeBackground(parsed.bgColor);
          if (parsed.textColor) editor.changeFillColor(parsed.textColor);
          if (parsed.accentColor) editor.changeStrokeColor(parsed.accentColor);
        }
      }
    } catch {}
    setStyleLoading(false);
  };

  const tabItems: { id: AiTab; label: string; icon: React.ReactNode }[] = [
    { id: "image", label: "Gorsel", icon: <ImageIcon className="size-3.5" /> },
    { id: "text", label: "Metin", icon: <Type className="size-3.5" /> },
    { id: "pin", label: "Pin Tasarla", icon: <LayoutTemplate className="size-3.5" /> },
    { id: "style", label: "Stil", icon: <Palette className="size-3.5" /> },
  ];

  const onClose = () => onChangeActiveTool("select");

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden",
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b">
        <div className="px-4 py-3 flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">AI Asistan</h2>
            <p className="text-[10px] text-gray-400">Yapay zeka ile tasarim yap</p>
          </div>
        </div>
        <div className="px-2 pb-1.5 flex gap-0.5">
          {tabItems.map(t => (
            <button key={t.id} onClick={() => setAiTab(t.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all flex-1 justify-center",
                aiTab === t.id ? "bg-violet-50 text-violet-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* IMAGE TAB */}
        {aiTab === "image" && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prompt</label>
              <Textarea
                disabled={mutation.isPending}
                placeholder="Bir Pinterest pin icin arka plan gorseli, minimalist, pastel renkler..."
                rows={4}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="rounded-lg text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Boyut</label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.id} onClick={() => setImageRatio(r.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all",
                      imageRatio === r.id ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}>
                    <div className={cn(
                      "rounded border",
                      imageRatio === r.id ? "border-violet-400 bg-violet-200" : "border-gray-200 bg-gray-100",
                      r.id === "2:3" && "w-4 h-6",
                      r.id === "1:1" && "w-5 h-5",
                      r.id === "9:16" && "w-3.5 h-6",
                      r.id === "1:2.1" && "w-3 h-6",
                    )} />
                    <span className="font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick prompts */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hazir Promptlar</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Minimalist pastel arka plan",
                  "Luks altin ve siyah doku",
                  "Dogal cicek deseni",
                  "Soyut gradient dalga",
                  "Ahsap masa uzerinden ust gorunum",
                  "Vintage kumas dokusu",
                ].map(p => (
                  <button key={p} onClick={() => setImagePrompt(p)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-gray-100 text-gray-500 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={onGenerateImage}
              disabled={mutation.isPending || !imagePrompt.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-10 rounded-lg shadow-sm"
            >
              {mutation.isPending ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Olusturuluyor...</>
              ) : (
                <><Sparkles className="size-4 mr-2" /> Gorsel Olustur</>
              )}
            </Button>

            {/* Generated images history */}
            {generatedImages.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Olusturulan Gorseller</label>
                <div className="grid grid-cols-2 gap-2">
                  {generatedImages.map((img, i) => (
                    <button key={i} onClick={() => addImageToCanvas(img)}
                      className="relative rounded-lg overflow-hidden border border-gray-100 hover:border-violet-300 hover:shadow-md transition-all group aspect-[2/3]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                        <Plus className="size-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEXT TAB */}
        {aiTab === "text" && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Konu veya Anahtar Kelime</label>
              <Input
                value={textTopic}
                onChange={e => setTextTopic(e.target.value)}
                placeholder="Ornek: el yapimi takilar, saglikli yasam..."
                className="rounded-lg h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Metin Turu</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TEXT_PROMPTS.map(t => (
                  <button key={t.label} onClick={() => setTextType(t.label)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      textType === t.label ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-100 text-gray-500 hover:border-gray-200"
                    )}>
                    <ChevronRight className={cn("size-3", textType === t.label ? "text-violet-500" : "text-gray-300")} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateAiText}
              disabled={textLoading || !textTopic.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-10 rounded-lg shadow-sm"
            >
              {textLoading ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Yaziliyor...</>
              ) : (
                <><Wand2 className="size-4 mr-2" /> Metin Olustur</>
              )}
            </Button>

            {textResult && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed">{textResult}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg"
                    onClick={() => addTextToCanvas(textResult, { fontSize: 48, fontWeight: 700 })}>
                    <Type className="size-3 mr-1.5" /> Baslik Olarak
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg"
                    onClick={() => addTextToCanvas(textResult, { fontSize: 24, fontWeight: 400 })}>
                    <Type className="size-3 mr-1.5" /> Aciklama Olarak
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-gray-400"
                  onClick={generateAiText}>
                  <RefreshCw className="size-3 mr-1.5" /> Tekrar Olustur
                </Button>
              </div>
            )}

            {/* Quick add texts */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hizli Metin Ekle</label>
              <div className="space-y-1.5">
                {[
                  { text: "Hemen Kesfet", style: { fontSize: 28, fontWeight: 700, fill: "#E60023" } },
                  { text: "Yeni Koleksiyon", style: { fontSize: 36, fontWeight: 700, fill: "#000000" } },
                  { text: "Ucretsiz Kargo", style: { fontSize: 24, fontWeight: 600, fill: "#16a34a" } },
                  { text: "%50 Indirim", style: { fontSize: 40, fontWeight: 800, fill: "#E60023" } },
                  { text: "Sinirli Stok", style: { fontSize: 22, fontWeight: 600, fill: "#dc2626" } },
                ].map((item, i) => (
                  <button key={i} onClick={() => addTextToCanvas(item.text, item.style)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group">
                    <span className="text-xs font-medium text-gray-600 group-hover:text-violet-700">{item.text}</span>
                    <Plus className="size-3.5 text-gray-300 group-hover:text-violet-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PIN DESIGNER TAB */}
        {aiTab === "pin" && (
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="size-3.5 text-violet-600" />
                <p className="text-xs font-semibold text-violet-700">Otomatik Pin Tasarimi</p>
              </div>
              <p className="text-[10px] text-violet-500">Konu girin, AI sizin icin baslik, aciklama ve CTA metni olusturup canvas&apos;a eklesin.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Konu</label>
              <Input
                value={pinTopic}
                onChange={e => setPinTopic(e.target.value)}
                placeholder="Ornek: El yapimi mumlar, Yoga ipuclari..."
                className="rounded-lg h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stil</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PIN_STYLES.map(s => (
                  <button key={s.id} onClick={() => setPinStyle(s.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      pinStyle === s.id ? "border-violet-500 bg-violet-50" : "border-gray-100 hover:border-gray-200"
                    )}>
                    <div className="flex gap-0.5">
                      <div className="size-4 rounded-sm border border-gray-200" style={{ backgroundColor: s.colors[0] }} />
                      <div className="size-4 rounded-sm border border-gray-200" style={{ backgroundColor: s.colors[1] }} />
                    </div>
                    <span className={cn("text-[9px] font-medium", pinStyle === s.id ? "text-violet-700" : "text-gray-400")}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateAiPin}
              disabled={pinLoading || !pinTopic.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-10 rounded-lg shadow-sm"
            >
              {pinLoading ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Tasarlaniyor...</>
              ) : (
                <><LayoutTemplate className="size-4 mr-2" /> Pin Tasarla</>
              )}
            </Button>

            {/* Quick pin templates */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hazir Sablonlar</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Urun Tanitim", topic: "Urun tanitimi ve satis", style: "bold" },
                  { name: "Blog Yazisi", topic: "Blog yazisi paylasimi", style: "minimal" },
                  { name: "Tarif Pini", topic: "Yemek tarifi", style: "warm" },
                  { name: "Ipucu Listesi", topic: "Faydali ipuclari listesi", style: "modern" },
                  { name: "Motivasyon", topic: "Motivasyon ve ilham", style: "dark" },
                  { name: "DIY Rehber", topic: "Kendin yap projesi", style: "nature" },
                ].map((tmpl, i) => (
                  <button key={i} onClick={() => { setPinTopic(tmpl.topic); setPinStyle(tmpl.style); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left group">
                    <div className="flex gap-0.5 shrink-0">
                      {(() => { const s = PIN_STYLES.find(s => s.id === tmpl.style); return s ? (
                        <><div className="size-3 rounded-sm" style={{ backgroundColor: s.colors[0], border: '1px solid #e5e7eb' }} /><div className="size-3 rounded-sm" style={{ backgroundColor: s.colors[1], border: '1px solid #e5e7eb' }} /></>
                      ) : null; })()}
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 group-hover:text-violet-700">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {aiTab === "style" && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stil Aciklamasi</label>
              <Input
                value={stylePrompt}
                onChange={e => setStylePrompt(e.target.value)}
                placeholder="Ornek: luks ve modern, sicak tonlar..."
                className="rounded-lg h-9 text-sm"
              />
            </div>

            <Button
              onClick={applyStyleToCanvas}
              disabled={styleLoading || !stylePrompt.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-10 rounded-lg shadow-sm"
            >
              {styleLoading ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Uygulanıyor...</>
              ) : (
                <><Palette className="size-4 mr-2" /> Stili Uygula</>
              )}
            </Button>

            {/* Quick styles */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hazir Arka Plan Renkleri</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { bg: "#ffffff", label: "Beyaz" },
                  { bg: "#f8f9fa", label: "Gri" },
                  { bg: "#1a1a2e", label: "Koyu" },
                  { bg: "#0f0f0f", label: "Siyah" },
                  { bg: "#fce4ec", label: "Pembe" },
                  { bg: "#fff8e1", label: "Krem" },
                  { bg: "#e8f5e9", label: "Yesil" },
                  { bg: "#e3f2fd", label: "Mavi" },
                  { bg: "#f3e5f5", label: "Mor" },
                  { bg: "#fff3e0", label: "Turuncu" },
                ].map(c => (
                  <button key={c.bg} onClick={() => editor?.changeBackground(c.bg)}
                    className="flex flex-col items-center gap-1 group">
                    <div className="size-10 rounded-lg border-2 border-gray-100 hover:border-violet-400 transition-all shadow-sm"
                      style={{ backgroundColor: c.bg }} />
                    <span className="text-[9px] text-gray-400 group-hover:text-violet-600">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient backgrounds */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gradient Arka Planlar</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { colors: ["#667eea", "#764ba2"], label: "Mor" },
                  { colors: ["#f093fb", "#f5576c"], label: "Pembe" },
                  { colors: ["#4facfe", "#00f2fe"], label: "Mavi" },
                  { colors: ["#43e97b", "#38f9d7"], label: "Yesil" },
                  { colors: ["#fa709a", "#fee140"], label: "Sunset" },
                  { colors: ["#a18cd1", "#fbc2eb"], label: "Pastel" },
                  { colors: ["#fccb90", "#d57eeb"], label: "Sicak" },
                  { colors: ["#e0c3fc", "#8ec5fc"], label: "Soft" },
                  { colors: ["#f5f7fa", "#c3cfe2"], label: "Gri" },
                  { colors: ["#0c3483", "#a2b6df"], label: "Okyanus" },
                ].map((g, i) => (
                  <button key={i} onClick={() => editor?.changeBackground(g.colors[0])}
                    className="flex flex-col items-center gap-1 group">
                    <div className="size-10 rounded-lg border-2 border-gray-100 hover:border-violet-400 transition-all shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }} />
                    <span className="text-[9px] text-gray-400 group-hover:text-violet-600">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
