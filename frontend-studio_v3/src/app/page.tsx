"use client";

import dynamic from "next/dynamic";

import { ResponseType } from "@/features/projects/api/use-get-project";

// `fabric` touches browser-only globals (e.g. DOMParser) as soon as it is
// imported, which breaks Next.js's server-side prerendering of this page.
// Loading the editor client-side only (ssr: false) avoids that entirely.
const Editor = dynamic(
  () => import("@/features/editor/components/editor").then((mod) => mod.Editor),
  { ssr: false },
);

const MOCK: ResponseType["data"] = {
  id: "local-demo",
  name: "Demo",
  json: "{}",
  width: 1000,
  height: 1500,
  isTemplate: false,
  isPro: false,
  thumbnailUrl: null,
};

export default function Home() {
  return (
    <div className="h-full">
      <Editor initialData={MOCK} />
    </div>
  );
}
