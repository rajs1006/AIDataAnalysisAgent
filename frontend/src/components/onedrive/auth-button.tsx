import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/store/store";
import { onedriveService } from "@/lib/api/onedrive";
import { OneDriveAuth } from "@/lib/types/onedrive";
import { setIsAuthenticating, setError } from "@/lib/store/onedrive";
import { useToast } from "@/components/ui/use-toast";

// PKCE Helper Functions
async function generateCodeVerifier() {
  const array = new Uint32Array(56);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash) as unknown as number[]);
  const base64Hash = btoa(String.fromCharCode.apply(null, hashArray));
  return base64Hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface OneDriveAuthButtonProps {
  onAuthComplete: (tokenData: OneDriveAuth) => void;
}

export const OneDriveAuthButton = ({
  onAuthComplete,
}: OneDriveAuthButtonProps) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const verifierRef = useRef<string>("");

  const handleAuth = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      console.log("Starting auth flow");
      let popupWindow: Window | null = null;

      try {
        dispatch(setIsAuthenticating(true));

        // Generate PKCE values
        const codeVerifier = await generateCodeVerifier();
        verifierRef.current = codeVerifier; // Store verifier in ref
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        popupWindow = onedriveService.createAuthPopup(codeChallenge);

        if (!popupWindow) {
          throw new Error("Popup blocked. Please enable popups for this site.");
        }

        const tokenData = await new Promise<OneDriveAuth>((resolve, reject) => {
          let isHandled = false;

          const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (isHandled) return;

            if (event.data?.type === "ONEDRIVE_AUTH_CALLBACK") {
              isHandled = true;
              try {
                const { code, error } = event.data;

                if (error) {
                  reject(new Error(error));
                  return;
                }

                if (!code) {
                  reject(new Error("No authorization code received"));
                  return;
                }

                console.log("Received code from popup, exchanging for token");
                const tokenData = await onedriveService.exchangeCodeForToken(
                  code,
                  verifierRef.current
                );
                resolve(tokenData);
              } catch (error) {
                reject(error);
              } finally {
                window.removeEventListener("message", handleMessage);
                if (popupWindow && !popupWindow.closed) {
                  popupWindow.close();
                }
              }
            }
          };

          window.addEventListener("message", handleMessage);

          const pollTimer = setInterval(() => {
            if (popupWindow?.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", handleMessage);
              if (!isHandled) {
                reject(new Error("Authentication cancelled"));
              }
            }
          }, 500);
        });

        console.log("Token exchange completed successfully");
        onAuthComplete(tokenData);

        toast({
          title: "Success",
          description: "Successfully authenticated with OneDrive",
        });
      } catch (error: any) {
        console.error("OneDrive auth error:", error);
        dispatch(setError(error.message));

        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        dispatch(setIsAuthenticating(false));
      }
    },
    [dispatch, toast, onAuthComplete]
  );

  return (
    <Button onClick={handleAuth} className="w-full" variant="outline">
      Connect OneDrive
    </Button>
  );
};
