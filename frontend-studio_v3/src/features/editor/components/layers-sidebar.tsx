"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Triangle,
  Minus,
  Pencil,
} from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayersSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

function getObjectIcon(type: string | undefined) {
  switch (type) {
    case "textbox":
    case "text":
    case "i-text":
      return Type;
    case "image":
      return ImageIcon;
    case "rect":
      return Square;
    case "circle":
      return Circle;
    case "triangle":
      return Triangle;
    case "line":
      return Minus;
    case "path":
    case "polygon":
      return Pencil;
    default:
      return Square;
  }
}

function getObjectLabel(obj: fabric.Object): string {
  const type = obj.type;
  if (type === "textbox" || type === "text" || type === "i-text") {
    // @ts-ignore
    const text = obj.text || "";
    return text.length > 20 ? text.substring(0, 20) + "..." : text || "Text";
  }
  if (type === "image") return "Image";
  if (type === "rect") return "Rectangle";
  if (type === "circle") return "Circle";
  if (type === "triangle") return "Triangle";
  if (type === "line") return "Line";
  if (type === "polygon") return "Shape";
  if (type === "path") return "Path";
  return type || "Object";
}

export const LayersSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: LayersSidebarProps) => {
  const [objects, setObjects] = useState<fabric.Object[]>([]);

  useEffect(() => {
    if (!editor) return;

    const updateObjects = () => {
      const objs = editor.getCanvasObjects();
      setObjects([...objs].reverse()); // Top layer first
    };

    updateObjects();

    // Listen to canvas events to update layers
    const canvas = editor.canvas;
    canvas.on("object:added", updateObjects);
    canvas.on("object:removed", updateObjects);
    canvas.on("object:modified", updateObjects);
    canvas.on("selection:created", updateObjects);
    canvas.on("selection:updated", updateObjects);
    canvas.on("selection:cleared", updateObjects);

    return () => {
      canvas.off("object:added", updateObjects);
      canvas.off("object:removed", updateObjects);
      canvas.off("object:modified", updateObjects);
      canvas.off("selection:created", updateObjects);
      canvas.off("selection:updated", updateObjects);
      canvas.off("selection:cleared", updateObjects);
    };
  }, [editor]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const isSelected = (obj: fabric.Object) => {
    return editor?.canvas.getActiveObjects().includes(obj) ?? false;
  };

  const selectObject = (obj: fabric.Object) => {
    if (!obj.selectable) return;
    editor?.canvas.discardActiveObject();
    editor?.canvas.setActiveObject(obj);
    editor?.canvas.renderAll();
  };

  const moveUp = (obj: fabric.Object) => {
    editor?.bringForward();
  };

  const moveDown = (obj: fabric.Object) => {
    editor?.sendBackwards();
  };

  const deleteObject = (obj: fabric.Object) => {
    editor?.canvas.remove(obj);
    editor?.canvas.renderAll();
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "layers" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="Layers"
        description="Manage canvas layers"
      />
      <ScrollArea>
        <div className="p-2 space-y-1">
          {objects.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No objects on canvas
            </div>
          )}
          {objects.map((obj, index) => {
            const Icon = getObjectIcon(obj.type);
            const label = getObjectLabel(obj);
            const selected = isSelected(obj);
            const visible = obj.visible !== false;
            const locked = !obj.selectable;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-50 group",
                  selected && "bg-blue-50 border border-blue-200",
                  !visible && "opacity-50"
                )}
                onClick={() => selectObject(obj)}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{label}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      editor?.toggleObjectVisibility(obj);
                      setObjects([...objects]);
                    }}
                  >
                    {visible ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      editor?.toggleObjectLock(obj);
                      setObjects([...objects]);
                    }}
                  >
                    {locked ? (
                      <Lock className="size-3" />
                    ) : (
                      <Unlock className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj);
                      moveUp(obj);
                    }}
                  >
                    <ChevronUp className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj);
                      moveDown(obj);
                    }}
                  >
                    <ChevronDown className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteObject(obj);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
