// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { onedriveService } from "@/lib/api/onedrive";
// import { useToast } from "@/components/ui/use-toast";
// import type { CreateConnectorDto } from "@/lib/types/connectors";

// export function OneDriveSetupForm() {
//   const [name, setName] = useState("");
//   const { toast } = useToast();
//   const [isConnecting, setIsConnecting] = useState(false);

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!name.trim()) {
//       toast({
//         title: "Error",
//         description: "Please enter a connector name",
//         variant: "destructive",
//       });
//       return;
//     }

//     setIsConnecting(true);
//     try {
//       const auth = onedriveService.createAuthPopup("fdff");
//       await onedriveService.createConnector({
//         name: name.trim(),
//         auth,
//         folder: {
//           id: "",
//           path: "",
//           drive_id: "",
//           name: "",
//         }, // You might want to add folder selection state if needed
//         settings: { sync_mode: "all" },
//       });

//       toast({
//         title: "Success",
//         description: "OneDrive connector created successfully",
//       });
//       setName(""); // Reset form
//     } catch (error: unknown) {
//       const errorMessage =
//         error instanceof Error ? error.message : "An unexpected error occurred";
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsConnecting(false);
//     }
//   };

//   return (
//     <form onSubmit={onSubmit} className="space-y-4">
//       <div>
//         <Label htmlFor="name">Connector Name</Label>
//         <Input
//           id="name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           placeholder="My OneDrive"
//           disabled={isConnecting}
//         />
//       </div>
//       <Button type="submit" disabled={isConnecting}>
//         {isConnecting ? "Connecting..." : "Connect OneDrive"}
//       </Button>
//     </form>
//   );
// }
