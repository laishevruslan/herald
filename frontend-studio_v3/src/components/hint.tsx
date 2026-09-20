"use client";

import React from "react";

interface HintProps {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
}

/**
 * Minimal tooltip stand-in. Uses the native `title` attribute for
 * accessibility/simplicity instead of pulling in @radix-ui/react-tooltip.
 */
export const Hint = ({ label, children }: HintProps) => {
  return <span title={label}>{children}</span>;
};

export default Hint;
