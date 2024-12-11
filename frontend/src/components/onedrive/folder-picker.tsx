import { useEffect, useCallback, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/store/store";
import { setSelectedFolder, setAuth } from "@/lib/store/onedrive";
import { OneDriveFolderInfo, OneDriveAuth } from "@/lib/types/onedrive";
import { useScript } from "@/hooks/use-script";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { OneDriveOptions } from "@/lib/types/onedrive";
import { onedriveService } from "@/lib/api/onedrive";

// PKCE Helper Functions remain the same
async function generateCodeVerifier() {
  const array = new Uint32Array(56);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
}

async function generateCodeChallenge(verifier: string) {
  console.log("1")
  const encoder = new TextEncoder();
  console.log("2 ", encoder);
  const data = encoder.encode(verifier);
  console.log("3 ", data);
  const hash = await crypto.subtle.digest("SHA-256", data);
  console.log("3 ", data);
  const hashArray = Array.from(new Uint8Array(hash) as unknown as number[]);
  const base64Hash = btoa(String.fromCharCode.apply(null, hashArray));
  return base64Hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const OneDriveFolderPicker = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.onedrive?.auth || null);
  const selectedFolder = useAppSelector(
    (state) => state.onedrive?.selectedFolder || null
  );
  const { toast } = useToast();
  const [verifier, setVerifier] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load the OneDrive SDK with retry logic
  const scriptStatus = useScript("https://js.live.net/v7.2/OneDrive.js");

  useEffect(() => {
    if (scriptStatus === "error") {
      toast({
        title: "Error",
        description: "Failed to load OneDrive SDK. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [scriptStatus, toast]);

  // Set authenticated state when auth changes
  useEffect(() => {
    if (auth) {
      setIsAuthenticated(true);
    }
  }, [auth]);

  const openOneDriveFolderPicker = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();

      if (!window.OneDrive || !auth) {
        toast({
          title: "Error",
          description: "OneDrive SDK not loaded or not authenticated",
          variant: "destructive",
        });
        return;
      }
      console.log(
        "process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!  : ",
        process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID
      );
      const options: OneDriveOptions = {
        clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
        action: "query",
        multiSelect: false,
        viewType: "folders",
        advanced: {
          filter: "folder,.folder",
          redirectUri: `${window.location.origin}/auth/callback/onedrive`,
          endpointHint: "api.onedrive.com",
        },
        success: async (response: any) => {
          setIsProcessing(true);
          try {
            if (response.value && response.value[0]) {
              const folderId = response.value[0].id;

              // Fetch complete folder details
              const folderDetails = await onedriveService.getFolderDetails(
                folderId,
                auth
              );

              dispatch(setSelectedFolder(folderDetails));
              toast({
                title: "Success",
                description: `Selected folder: ${folderDetails.name}`,
              });
            }
          } catch (error) {
            console.error("Error processing folder selection:", error);
            toast({
              title: "Error",
              description: "Failed to process folder selection",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        cancel: () => {
          if (!document.hidden) {
            toast({
              title: "Selection Cancelled",
              description: "No folder was selected",
            });
          }
        },
        error: (error: any) => {
          console.error("OneDrive Picker Error:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to select folder",
            variant: "destructive",
          });
        },
      };

      try {
        window.OneDrive.open(options);
      } catch (error) {
        console.error("Failed to open OneDrive picker:", error);
        toast({
          title: "Error",
          description: "Failed to open folder picker",
          variant: "destructive",
        });
      }
    },
    [auth, dispatch]
  );

  const handleAuth = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      console.log("code verifier")
      const codeVerifier = await generateCodeVerifier();
      setVerifier(codeVerifier);
      console.log("code verifier 2");
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log("code challenge");
      const popup = onedriveService.createAuthPopup(codeChallenge);
      console.log("code popup");
      if (!popup) {
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

              const tokenData = await onedriveService.exchangeCodeForToken(
                code,
                codeVerifier
              );
              resolve(tokenData);
            } catch (error) {
              reject(error);
            } finally {
              window.removeEventListener("message", handleMessage);
              if (popup && !popup.closed) {
                popup.close();
              }
            }
          }
        };

        window.addEventListener("message", handleMessage);

        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            window.removeEventListener("message", handleMessage);
            if (!isHandled) {
              reject(new Error("Authentication cancelled"));
            }
          }
        }, 500);
      });

      dispatch(setAuth(tokenData));
      setIsAuthenticated(true);
      toast({
        title: "Success",
        description: "Successfully authenticated with OneDrive",
      });
    } catch (error: any) {
      console.error("OneDrive auth error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, toast]);

  const handleFolderSelection = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (isProcessing) return;

      if (!auth && !isAuthenticated) {
        await handleAuth();
      } else {
        setIsProcessing(true);
        openOneDriveFolderPicker();
      }
    },
    [auth, isAuthenticated, handleAuth, openOneDriveFolderPicker, isProcessing]
  );

  return (
    <div className="space-y-4">
      {selectedFolder ? (
        <div className="p-4 border rounded-lg bg-muted">
          <h4 className="font-medium mb-2">Selected Folder</h4>
          <p className="text-sm text-muted-foreground">
            Name: {selectedFolder.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Path: {selectedFolder.path}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFolderSelection}
            className="mt-2"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Change Folder"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleFolderSelection}
          className="w-full"
          disabled={isProcessing}
        >
          {isProcessing
            ? "Processing..."
            : isAuthenticated
            ? "Select Folder"
            : "Sign in to OneDrive"}
        </Button>
      )}
    </div>
  );
};
