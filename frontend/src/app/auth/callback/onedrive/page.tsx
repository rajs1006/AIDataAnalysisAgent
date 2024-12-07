"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function OneDriveCallback() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorDesc = params.get("error_description");

      try {
        if (error || !code) {
          window.opener?.postMessage(
            {
              type: "ONEDRIVE_AUTH_CALLBACK",
              error: errorDesc || error || "No authorization code received",
            },
            window.location.origin
          );
          return;
        }

        window.opener?.postMessage(
          {
            type: "ONEDRIVE_AUTH_CALLBACK",
            code,
          },
          window.location.origin
        );
      } catch (error) {
        console.error("Callback handling error:", error);
      } finally {
        // Close window only if we're in a popup
        if (window.opener) {
          window.close();
        } else {
          // Only redirect if we're not in a popup
          router.push("/dashboard");
        }
      }
    };

    handleCallback();
  }, [router, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Processing...</h1>
        <p>Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
}
