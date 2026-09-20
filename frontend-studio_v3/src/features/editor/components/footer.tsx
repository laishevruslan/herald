import { Maximize2, Minus, Plus, ZoomIn, ZoomOut } from "lucide-react";

import { Editor } from "@/features/editor/types";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";

interface FooterProps {
  editor: Editor | undefined;
}

export const Footer = ({ editor }: FooterProps) => {
  const zoomPercent = editor?.canvas
    ? Math.round(editor.canvas.getZoom() * 100)
    : 100;

  return (
    <footer className="h-[52px] border-t bg-white w-full flex items-center z-[49] px-4 shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        <Hint label="Uzaklastir" side="top" sideOffset={10}>
          <Button
            onClick={() => editor?.zoomOut()}
            size="icon"
            variant="ghost"
            className="size-7 rounded-md hover:bg-white"
          >
            <Minus className="size-3.5" />
          </Button>
        </Hint>
        <div className="min-w-[52px] text-center">
          <span className="text-xs font-semibold text-gray-600">{zoomPercent}%</span>
        </div>
        <Hint label="Yakinlastir" side="top" sideOffset={10}>
          <Button
            onClick={() => editor?.zoomIn()}
            size="icon"
            variant="ghost"
            className="size-7 rounded-md hover:bg-white"
          >
            <Plus className="size-3.5" />
          </Button>
        </Hint>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <Hint label="Sifirla" side="top" sideOffset={10}>
          <Button
            onClick={() => editor?.autoZoom()}
            size="icon"
            variant="ghost"
            className="size-7 rounded-md hover:bg-white"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </Hint>
      </div>
      <div className="flex-1" />
    </footer>
  );
};
