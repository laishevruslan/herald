import { useEffect, useMemo, useState } from "react";

import { ActiveTool, Editor, CANVAS_PRESETS } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const SettingsSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: SettingsSidebarProps) => {
  const workspace = editor?.getWorkspace();

  const initialWidth = useMemo(() => `${workspace?.width ?? 0}`, [workspace]);
  const initialHeight = useMemo(() => `${workspace?.height ?? 0}`, [workspace]);
  const initialBackground = useMemo(() => workspace?.fill ?? "#ffffff", [workspace]);

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [background, setBackground] = useState(initialBackground);

  useEffect(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
    setBackground(initialBackground);
  }, [initialWidth, initialHeight, initialBackground]);

  const changeWidth = (value: string) => setWidth(value);
  const changeHeight = (value: string) => setHeight(value);
  const changeBackground = (value: string) => {
    setBackground(value);
    editor?.changeBackground(value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    editor?.changeSize({
      width: parseInt(width, 10),
      height: parseInt(height, 10),
    });
  };

  const onClose = () => onChangeActiveTool("select");

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "settings" ? "visible" : "hidden",
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-bold text-gray-800">Canvas Ayarlari</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Boyut ve arka plan ayarlari</p>
      </div>

      <ScrollArea className="flex-1">
        {/* Pinterest Presets */}
        <div className="p-4 space-y-3">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pinterest Boyutlari</label>
          <div className="grid grid-cols-1 gap-1.5">
            {CANVAS_PRESETS.map((preset) => {
              const isSelected = parseInt(width) === preset.width && parseInt(height) === preset.height;
              return (
                <button
                  key={preset.name}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-[#E60023] bg-red-50/50 ring-1 ring-[#E60023]/10"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                  )}
                  onClick={() => {
                    setWidth(`${preset.width}`);
                    setHeight(`${preset.height}`);
                    editor?.changeSize({ width: preset.width, height: preset.height });
                  }}
                >
                  <div className={cn(
                    "rounded border shrink-0",
                    isSelected ? "border-[#E60023]/40 bg-[#E60023]/10" : "border-gray-200 bg-gray-100",
                    preset.height / preset.width > 2 ? "w-3 h-8" :
                    preset.height / preset.width > 1.3 ? "w-4 h-6" :
                    "w-5 h-5"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium", isSelected ? "text-[#E60023]" : "text-gray-700")}>{preset.name}</p>
                    <p className="text-[10px] text-gray-400">{preset.width} x {preset.height}px</p>
                  </div>
                  {isSelected && (
                    <div className="size-5 rounded-full bg-[#E60023] flex items-center justify-center shrink-0">
                      <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Size */}
        <div className="border-t">
          <form className="p-4 space-y-3" onSubmit={onSubmit}>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ozel Boyut</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">Genislik (px)</Label>
                <Input
                  placeholder="1000"
                  value={width}
                  type="number"
                  onChange={(e) => changeWidth(e.target.value)}
                  className="rounded-lg h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">Yukseklik (px)</Label>
                <Input
                  placeholder="1500"
                  value={height}
                  type="number"
                  onChange={(e) => changeHeight(e.target.value)}
                  className="rounded-lg h-9 text-sm"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-9 rounded-lg bg-gray-800 hover:bg-gray-900 text-sm font-medium">
              Boyutlandir
            </Button>
          </form>
        </div>

        {/* Background Color */}
        <div className="border-t p-4">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-3">Arka Plan Rengi</label>
          <ColorPicker
            value={background as string}
            onChange={changeBackground}
          />
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
