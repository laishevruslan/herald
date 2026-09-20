"use client";

import { CiFileOn } from "react-icons/ci";
import { BsCloudCheck, BsCloudSlash } from "react-icons/bs";
import { useFilePicker } from "use-file-picker";
import { useMutationState } from "@tanstack/react-query";
import {
  ChevronDown,
  Download,
  Loader,
  MousePointerClick,
  Redo2,
  Undo2,
  FileJson,
  Image as ImageIcon,
  FileImage,
  FileCode,
} from "lucide-react";

import { UserButton } from "@/features/auth/components/user-button";

import { ActiveTool, Editor } from "@/features/editor/types";
import { Logo } from "@/features/editor/components/logo";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  id: string;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const Navbar = ({
  id,
  editor,
  activeTool,
  onChangeActiveTool,
}: NavbarProps) => {
  const data = useMutationState({
    filters: {
      mutationKey: ["project", { id }],
      exact: true,
    },
    select: (mutation) => mutation.state.status,
  });

  const currentStatus = data[data.length - 1];

  const isError = currentStatus === "error";
  const isPending = currentStatus === "pending";

  const { openFilePicker } = useFilePicker({
    accept: ".json",
    onFilesSuccessfullySelected: ({ plainFiles }: any) => {
      if (plainFiles && plainFiles.length > 0) {
        const file = plainFiles[0];
        const reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = () => {
          editor?.loadJson(reader.result as string);
        };
      }
    },
  });

  return (
    <nav className="w-full flex items-center h-[68px] border-b bg-white px-4 lg:px-6">
      <Logo />
      <Separator orientation="vertical" className="mx-4 h-8" />
      <div className="flex items-center gap-x-1 h-full">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dosya
              <ChevronDown className="size-3.5 ml-1.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56 rounded-xl shadow-lg border border-gray-100">
            <DropdownMenuItem
              onClick={() => openFilePicker()}
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
            >
              <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CiFileOn className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Dosya Ac</p>
                <p className="text-[11px] text-muted-foreground">JSON tasarim dosyasi</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="mx-1.5 h-6" />
        <Hint label="Sec" side="bottom" sideOffset={10}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeActiveTool("select")}
            className={cn("size-8 rounded-lg", activeTool === "select" && "bg-gray-100")}
          >
            <MousePointerClick className="size-4" />
          </Button>
        </Hint>
        <Hint label="Geri Al" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canUndo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onUndo()}
            className="size-8 rounded-lg"
          >
            <Undo2 className="size-4" />
          </Button>
        </Hint>
        <Hint label="Ileri Al" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canRedo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onRedo()}
            className="size-8 rounded-lg"
          >
            <Redo2 className="size-4" />
          </Button>
        </Hint>
        <Separator orientation="vertical" className="mx-1.5 h-6" />
        <div className="flex items-center gap-x-1.5">
          {isPending && (
            <div className="flex items-center gap-x-1.5 px-2 py-1 rounded-md bg-blue-50">
              <Loader className="size-3.5 animate-spin text-blue-500" />
              <span className="text-[11px] font-medium text-blue-600">Kaydediliyor...</span>
            </div>
          )}
          {!isPending && isError && (
            <div className="flex items-center gap-x-1.5 px-2 py-1 rounded-md bg-red-50">
              <BsCloudSlash className="size-4 text-red-400" />
              <span className="text-[11px] font-medium text-red-500">Kaydedilemedi</span>
            </div>
          )}
          {!isPending && !isError && (
            <div className="flex items-center gap-x-1.5 px-2 py-1 rounded-md bg-emerald-50">
              <BsCloudCheck className="size-4 text-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-600">Kaydedildi</span>
            </div>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-x-3">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg h-9 px-4 text-sm font-medium shadow-sm">
              <Download className="size-4 mr-2" />
              Indir
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56 rounded-xl shadow-lg border border-gray-100 p-1.5">
            <DropdownMenuItem
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
              onClick={() => editor?.saveJson()}
            >
              <div className="size-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <FileJson className="size-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium">JSON</p>
                <p className="text-[11px] text-muted-foreground">Daha sonra duzenlemek icin</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
              onClick={() => editor?.savePng()}
            >
              <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ImageIcon className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">PNG</p>
                <p className="text-[11px] text-muted-foreground">Seffaf arka plan destekli</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
              onClick={() => editor?.saveJpg()}
            >
              <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileImage className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">JPG</p>
                <p className="text-[11px] text-muted-foreground">Kucuk dosya boyutu</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg cursor-pointer"
              onClick={() => editor?.saveSvg()}
            >
              <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileCode className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">SVG</p>
                <p className="text-[11px] text-muted-foreground">Vektor formatinda</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UserButton />
      </div>
    </nav>
  );
};
