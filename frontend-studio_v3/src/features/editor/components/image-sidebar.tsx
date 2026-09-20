"use client";

import { AlertTriangle, Loader } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({ editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Görsel Yükle" description="Pin tasarımına görsel ekle" />
      <ScrollArea>
        <div className="p-4 space-y-4">
          <UploadButton
            appearance={{
              button: "w-full text-sm font-medium",
              allowedContent: "hidden",
            }}
            content={{
              button: "Görsel Yükle",
            }}
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              editor?.addImage(res[0].url);
            }}
          />
          <div className="text-center text-xs text-muted-foreground">
            PNG, JPG, SVG desteklenir (maks. 4MB)
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
