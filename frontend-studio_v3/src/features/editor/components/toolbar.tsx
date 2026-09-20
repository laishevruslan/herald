import { useState } from "react";

import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaUnderline
} from "react-icons/fa";
import { TbColorFilter } from "react-icons/tb";
import { BsBorderWidth } from "react-icons/bs";
import { RxTransparencyGrid } from "react-icons/rx";
import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  SquareSplitHorizontal,
  Copy,
  Space,
} from "lucide-react";
import { TbShadow, TbLineHeight } from "react-icons/tb";

import { isTextType } from "@/features/editor/utils";
import { FontSizeInput } from "@/features/editor/components/font-size-input";
import {
  ActiveTool,
  Editor,
  FONT_SIZE,
  FONT_WEIGHT
} from "@/features/editor/types";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";

interface ToolbarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Toolbar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ToolbarProps) => {
  const initialFillColor = editor?.getActiveFillColor();
  const initialStrokeColor = editor?.getActiveStrokeColor();
  const initialFontFamily = editor?.getActiveFontFamily();
  const initialFontWeight = editor?.getActiveFontWeight() || FONT_WEIGHT;
  const initialFontStyle = editor?.getActiveFontStyle();
  const initialFontLinethrough = editor?.getActiveFontLinethrough();
  const initialFontUnderline = editor?.getActiveFontUnderline();
  const initialTextAlign = editor?.getActiveTextAlign();
  const initialFontSize = editor?.getActiveFontSize() || FONT_SIZE;
  const initialCharSpacing = editor?.getActiveCharSpacing() || 0;
  const initialLineHeight = editor?.getActiveLineHeight() || 1.16;

  const [properties, setProperties] = useState({
    fillColor: initialFillColor,
    strokeColor: initialStrokeColor,
    fontFamily: initialFontFamily,
    fontWeight: initialFontWeight,
    fontStyle: initialFontStyle,
    fontLinethrough: initialFontLinethrough,
    fontUnderline: initialFontUnderline,
    textAlign: initialTextAlign,
    fontSize: initialFontSize,
    charSpacing: initialCharSpacing,
    lineHeight: initialLineHeight,
    hasShadow: false,
  });

  const selectedObject = editor?.selectedObjects[0];
  const selectedObjectType = editor?.selectedObjects[0]?.type;

  const isText = isTextType(selectedObjectType);
  const isImage = selectedObjectType === "image";

  const onChangeFontSize = (value: number) => {
    if (!selectedObject) return;
    editor?.changeFontSize(value);
    setProperties((current) => ({ ...current, fontSize: value }));
  };

  const onChangeTextAlign = (value: string) => {
    if (!selectedObject) return;
    editor?.changeTextAlign(value);
    setProperties((current) => ({ ...current, textAlign: value }));
  };

  const toggleBold = () => {
    if (!selectedObject) return;
    const newValue = properties.fontWeight > 500 ? 500 : 700;
    editor?.changeFontWeight(newValue);
    setProperties((current) => ({ ...current, fontWeight: newValue }));
  };

  const toggleItalic = () => {
    if (!selectedObject) return;
    const isItalic = properties.fontStyle === "italic";
    const newValue = isItalic ? "normal" : "italic";
    editor?.changeFontStyle(newValue);
    setProperties((current) => ({ ...current, fontStyle: newValue }));
  };

  const toggleLinethrough = () => {
    if (!selectedObject) return;
    const newValue = !properties.fontLinethrough;
    editor?.changeFontLinethrough(newValue);
    setProperties((current) => ({ ...current, fontLinethrough: newValue }));
  };

  const toggleUnderline = () => {
    if (!selectedObject) return;
    const newValue = !properties.fontUnderline;
    editor?.changeFontUnderline(newValue);
    setProperties((current) => ({ ...current, fontUnderline: newValue }));
  };

  const toggleShadow = () => {
    if (!selectedObject) return;
    const hasShadow = properties.hasShadow;
    if (hasShadow) {
      editor?.canvas.getActiveObjects().forEach((obj: any) => {
        obj.set({ shadow: null });
      });
      editor?.canvas.renderAll();
    } else {
      editor?.canvas.getActiveObjects().forEach((obj: any) => {
        obj.set({
          shadow: { color: "rgba(0,0,0,0.5)", blur: 5, offsetX: 2, offsetY: 2 },
        });
      });
      editor?.canvas.renderAll();
    }
    setProperties((current) => ({ ...current, hasShadow: !hasShadow }));
  };

  const onChangeCharSpacing = (delta: number) => {
    if (!selectedObject) return;
    const newValue = Math.max(0, Math.min(1000, properties.charSpacing + delta));
    editor?.changeCharSpacing(newValue);
    setProperties((current) => ({ ...current, charSpacing: newValue }));
  };

  const onChangeLineHeight = (delta: number) => {
    if (!selectedObject) return;
    const newValue = Math.max(0.5, Math.min(5, properties.lineHeight + delta));
    editor?.changeLineHeight(parseFloat(newValue.toFixed(2)));
    setProperties((current) => ({ ...current, lineHeight: parseFloat(newValue.toFixed(2)) }));
  };

  if (editor?.selectedObjects.length === 0) {
    return (
      <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] px-4">
        <p className="text-xs text-gray-400">Duzenlemek icin bir nesne secin</p>
      </div>
    );
  }

  const ToolBtn = ({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) => (
    <Hint label={label} side="bottom" sideOffset={5}>
      <Button
        onClick={onClick}
        size="icon"
        variant="ghost"
        className={cn("size-8 rounded-lg", active && "bg-gray-100 text-gray-900")}
      >
        {children}
      </Button>
    </Hint>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-100 mx-1" />;

  return (
    <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] px-4 gap-x-0.5">
      {/* Color */}
      {!isImage && (
        <ToolBtn label="Renk" onClick={() => onChangeActiveTool("fill")} active={activeTool === "fill"}>
          <div className="rounded size-4 border shadow-sm" style={{ backgroundColor: properties.fillColor }} />
        </ToolBtn>
      )}

      {/* Stroke */}
      {!isText && (
        <>
          <ToolBtn label="Cizgi Rengi" onClick={() => onChangeActiveTool("stroke-color")} active={activeTool === "stroke-color"}>
            <div className="rounded size-4 border-2 bg-white" style={{ borderColor: properties.strokeColor }} />
          </ToolBtn>
          <ToolBtn label="Cizgi Kalinligi" onClick={() => onChangeActiveTool("stroke-width")} active={activeTool === "stroke-width"}>
            <BsBorderWidth className="size-4" />
          </ToolBtn>
        </>
      )}

      {/* Text tools */}
      {isText && (
        <>
          <Hint label="Font" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("font")}
              size="sm"
              variant="ghost"
              className={cn("h-8 px-2.5 text-xs rounded-lg font-medium", activeTool === "font" && "bg-gray-100")}
            >
              <span className="max-w-[80px] truncate">{properties.fontFamily}</span>
              <ChevronDown className="size-3 ml-1 text-gray-400" />
            </Button>
          </Hint>
          <Divider />
          <ToolBtn label="Kalin" onClick={toggleBold} active={properties.fontWeight > 500}>
            <FaBold className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Italik" onClick={toggleItalic} active={properties.fontStyle === "italic"}>
            <FaItalic className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Alt Cizgi" onClick={toggleUnderline} active={!!properties.fontUnderline}>
            <FaUnderline className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Ustuze Cizgi" onClick={toggleLinethrough} active={!!properties.fontLinethrough}>
            <FaStrikethrough className="size-3.5" />
          </ToolBtn>
          <Divider />
          <ToolBtn label="Sola Hizala" onClick={() => onChangeTextAlign("left")} active={properties.textAlign === "left"}>
            <AlignLeft className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Ortala" onClick={() => onChangeTextAlign("center")} active={properties.textAlign === "center"}>
            <AlignCenter className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Saga Hizala" onClick={() => onChangeTextAlign("right")} active={properties.textAlign === "right"}>
            <AlignRight className="size-3.5" />
          </ToolBtn>
          <Divider />
          <FontSizeInput value={properties.fontSize} onChange={onChangeFontSize} />
          <Divider />
          <ToolBtn label="Golge" onClick={toggleShadow} active={properties.hasShadow}>
            <TbShadow className="size-4" />
          </ToolBtn>
          <ToolBtn label="Harf Araligi" onClick={() => onChangeCharSpacing(50)}>
            <Space className="size-4" />
          </ToolBtn>
          <ToolBtn label="Satir Yuksekligi" onClick={() => onChangeLineHeight(0.1)}>
            <TbLineHeight className="size-4" />
          </ToolBtn>
        </>
      )}

      {/* Image tools */}
      {isImage && (
        <>
          <ToolBtn label="Filtreler" onClick={() => onChangeActiveTool("filter")} active={activeTool === "filter"}>
            <TbColorFilter className="size-4" />
          </ToolBtn>
          <ToolBtn label="Arka Plan Kaldir" onClick={() => onChangeActiveTool("remove-bg")} active={activeTool === "remove-bg"}>
            <SquareSplitHorizontal className="size-4" />
          </ToolBtn>
        </>
      )}

      <Divider />

      {/* Common tools */}
      <ToolBtn label="One Getir" onClick={() => editor?.bringForward()}>
        <ArrowUp className="size-4" />
      </ToolBtn>
      <ToolBtn label="Arkaya Gonder" onClick={() => editor?.sendBackwards()}>
        <ArrowDown className="size-4" />
      </ToolBtn>
      <ToolBtn label="Saydamlik" onClick={() => onChangeActiveTool("opacity")} active={activeTool === "opacity"}>
        <RxTransparencyGrid className="size-4" />
      </ToolBtn>
      <ToolBtn label="Kopyala" onClick={() => { editor?.onCopy(); editor?.onPaste(); }}>
        <Copy className="size-4" />
      </ToolBtn>
      <ToolBtn label="Sil" onClick={() => editor?.delete()}>
        <Trash2 className="size-4 text-red-500" />
      </ToolBtn>
    </div>
  );
};
