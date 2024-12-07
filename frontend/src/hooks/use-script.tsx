import { useState, useEffect } from "react";

type ScriptStatus = "loading" | "ready" | "error";

export function useScript(src: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>(() => {
    if (typeof window === "undefined") return "loading";

    // Check if script is already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      return "ready";
    }

    return "loading";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent duplicate script loading
    if (document.querySelector(`script[src="${src}"]`)) {
      setStatus("ready");
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    const handleLoad = () => setStatus("ready");
    const handleError = () => setStatus("error");

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, [src]);

  return status;
}

// Add type definition for window
declare global {
  interface Window {
    OneDrive?: any;
  }
}
