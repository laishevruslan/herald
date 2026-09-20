import {
  ActiveTool,
  Editor,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TextSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

const PINTEREST_TEXT_PRESETS = [
  {
    label: "Pin Title",
    text: "Pin Title Here",
    fontSize: 64,
    fontWeight: 700,
    fontFamily: "Playfair Display",
  },
  {
    label: "Pin Subtitle",
    text: "Subtitle text",
    fontSize: 36,
    fontWeight: 500,
    fontFamily: "Poppins",
  },
  {
    label: "Call to Action",
    text: "SHOP NOW",
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "Montserrat",
  },
  {
    label: "Website URL",
    text: "www.yoursite.com",
    fontSize: 20,
    fontWeight: 400,
    fontFamily: "Inter",
  },
  {
    label: "Quote Text",
    text: '"Your inspiring quote here"',
    fontSize: 48,
    fontWeight: 400,
    fontFamily: "Dancing Script",
  },
  {
    label: "List Item",
    text: "1. First item\n2. Second item\n3. Third item",
    fontSize: 28,
    fontWeight: 400,
    fontFamily: "Open Sans",
  },
  {
    label: "Bold Banner",
    text: "BIG SALE",
    fontSize: 80,
    fontWeight: 700,
    fontFamily: "Bebas Neue",
  },
  {
    label: "Handwritten",
    text: "Personal touch",
    fontSize: 44,
    fontWeight: 400,
    fontFamily: "Caveat",
  },
];

export const TextSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: TextSidebarProps) => {
  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "text" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Text"
        description="Add text to your Pinterest pin"
      />
      <ScrollArea>
        <div className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Basic</p>
          <Button
            className="w-full"
            onClick={() => editor?.addText("Textbox")}
          >
            Add a textbox
          </Button>
          <Button
            className="w-full h-16"
            variant="secondary"
            size="lg"
            onClick={() => editor?.addText("Heading", {
              fontSize: 80,
              fontWeight: 700,
            })}
          >
            <span className="text-3xl font-bold">
              Heading
            </span>
          </Button>
          <Button
            className="w-full h-16"
            variant="secondary"
            size="lg"
            onClick={() => editor?.addText("Subheading", {
              fontSize: 44,
              fontWeight: 600,
            })}
          >
            <span className="text-xl font-semibold">
              Subheading
            </span>
          </Button>
          <Button
            className="w-full h-16"
            variant="secondary"
            size="lg"
            onClick={() => editor?.addText("Paragraph", {
              fontSize: 32,
            })}
          >
            Paragraph
          </Button>
        </div>
        <div className="p-4 space-y-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pinterest Pin Styles</p>
          {PINTEREST_TEXT_PRESETS.map((preset, index) => (
            <Button
              key={index}
              className="w-full h-auto py-3 justify-start text-left"
              variant="secondary"
              onClick={() => editor?.addText(preset.text, {
                fontSize: preset.fontSize,
                fontWeight: preset.fontWeight,
                fontFamily: preset.fontFamily,
              })}
            >
              <div className="flex flex-col gap-1 w-full">
                <span className="text-xs text-muted-foreground">{preset.label}</span>
                <span
                  className="truncate"
                  style={{
                    fontFamily: preset.fontFamily,
                    fontSize: Math.min(preset.fontSize * 0.35, 24),
                    fontWeight: preset.fontWeight,
                  }}
                >
                  {preset.text}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
