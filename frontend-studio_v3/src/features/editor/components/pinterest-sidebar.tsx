"use client";

import { ActiveTool, Editor } from "@/features/editor/types";

import { cn } from "@/lib/utils";

interface PinterestSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  projectId: string;
}

/**
 * Local stub for the Pinterest integration panel. In the full product this
 * would show Pinterest boards/pins management; here it just renders a
 * placeholder message so the editor shell compiles and runs standalone.
 */
export const PinterestSidebar = ({
  activeTool,
}: PinterestSidebarProps) => {
  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col items-center justify-center p-6 text-center",
        activeTool === "pinterest" ? "visible" : "hidden",
      )}
    >
      <p className="text-sm text-muted-foreground">
        Pinterest panel (local stub)
      </p>
    </aside>
  );
};

export default PinterestSidebar;
