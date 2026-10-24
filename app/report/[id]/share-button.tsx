"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await navigator.clipboard?.writeText(window.location.href).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      }}
    >
      {copied ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
      {copied ? "Link copied" : "Copy link"}
    </Button>
  );
}
