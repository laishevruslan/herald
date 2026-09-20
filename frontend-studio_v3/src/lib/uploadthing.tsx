"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

interface UploadButtonProps {
  endpoint?: string;
  appearance?: {
    button?: string;
    allowedContent?: string;
    container?: string;
  };
  content?: {
    button?: React.ReactNode;
    allowedContent?: React.ReactNode;
  };
  onClientUploadComplete?: (res: { url: string }[]) => void;
  onUploadError?: (error: Error) => void;
}

/**
 * Local stand-in for `@uploadthing/react`'s `UploadButton`.
 *
 * Instead of uploading to a remote service, this reads the selected file as
 * a data URL and immediately reports it back through
 * `onClientUploadComplete`, so the rest of the editor (which only cares about
 * a resulting `url`) keeps working unmodified.
 */
export const UploadButton = ({
  appearance,
  content,
  onClientUploadComplete,
  onUploadError,
}: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      onClientUploadComplete?.([{ url }]);
    };
    reader.onerror = () => {
      onUploadError?.(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be picked again if desired.
    event.target.value = "";
  };

  return (
    <div className={cn("w-full", appearance?.container)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition inline-flex items-center justify-center",
          appearance?.button,
        )}
      >
        {content?.button ?? "Upload"}
      </button>
      {content?.allowedContent && (
        <div className={cn("text-xs text-muted-foreground mt-1", appearance?.allowedContent)}>
          {content.allowedContent}
        </div>
      )}
    </div>
  );
};

export default UploadButton;
