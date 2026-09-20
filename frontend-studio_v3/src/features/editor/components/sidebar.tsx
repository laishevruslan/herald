"use client";

import {
  LayoutTemplate,
  ImageIcon,
  Pencil,
  Settings,
  Shapes,
  Sparkles,
  Type,
  Layers,
  Camera,
} from "lucide-react";

import { FaPinterest } from "react-icons/fa";

import { cn } from "@/lib/utils";
import { ActiveTool } from "@/features/editor/types";

interface SidebarProps {
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const tools = [
  { id: "templates" as const, label: "Tasarim", icon: LayoutTemplate },
  { id: "images" as const, label: "Gorsel", icon: ImageIcon },
  { id: "text" as const, label: "Metin", icon: Type },
  { id: "shapes" as const, label: "Sekil", icon: Shapes },
  { id: "draw" as const, label: "Cizim", icon: Pencil },
  { id: "layers" as const, label: "Katman", icon: Layers },
  { id: "pexels" as const, label: "Pexels", icon: Camera, accent: true },
  { id: "ai" as const, label: "AI", icon: Sparkles, accent: true },
  { id: "settings" as const, label: "Ayarlar", icon: Settings },
];

export const Sidebar = ({
  activeTool,
  onChangeActiveTool,
}: SidebarProps) => {
  return (
    <aside className="bg-white flex flex-col w-[88px] h-full border-r">
      {/* Pinterest - Main Feature */}
      <button
        onClick={() => onChangeActiveTool("pinterest")}
        className={cn(
          "w-full flex flex-col items-center justify-center gap-1 px-2 py-3.5 transition-all relative",
          activeTool === "pinterest"
            ? "bg-[#E60023] text-white"
            : "bg-gradient-to-b from-red-50/80 to-transparent text-[#E60023] hover:bg-red-50"
        )}
      >
        <div className={cn(
          "size-9 rounded-xl flex items-center justify-center transition-all",
          activeTool === "pinterest" ? "bg-white/20" : "bg-[#E60023]/10"
        )}>
          <FaPinterest className="size-5" />
        </div>
        <span className="text-[10px] font-bold tracking-wide">Pinbot</span>
        <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </button>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto py-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onChangeActiveTool(tool.id)}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1 px-2 py-3 transition-all relative group",
              activeTool === tool.id
                ? tool.accent
                  ? "bg-violet-50 text-violet-700"
                  : "bg-gray-100 text-gray-900"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/80"
            )}
          >
            <div className={cn(
              "size-8 rounded-lg flex items-center justify-center transition-all",
              activeTool === tool.id
                ? tool.accent ? "bg-violet-100" : "bg-white shadow-sm"
                : "group-hover:bg-white group-hover:shadow-sm"
            )}>
              <tool.icon className={cn(
                "size-4 transition-all",
                tool.accent && activeTool === tool.id && "text-violet-600"
              )} />
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              activeTool === tool.id && "font-semibold"
            )}>
              {tool.label}
            </span>
            {activeTool === tool.id && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gray-800" />
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};
