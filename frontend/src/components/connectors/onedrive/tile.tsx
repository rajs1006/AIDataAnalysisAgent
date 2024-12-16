// // src/components/connectors/onedrive/tile.tsx
// import React from "react";
// import { Cloud } from "lucide-react";
// import { ConnectorTile } from "../base/connector-tile";
// import { useConnectors } from "@/lib/hooks/use-connectors";
// import { ConnectorType } from "@/lib/types/connectors";

// export function OneDriveTile() {
//   const { connectors, openSetupDialog } = useConnectors();
//   const activeCount = connectors.filter(
//     (c) => c.type === ConnectorType.ONEDRIVE && c.status === "active"
//   ).length;

//   return (
//     <ConnectorTile
//       title="OneDrive"
//       description="Connect to your OneDrive files"
//       icon={<Cloud className="w-6 h-6" />}
//       isActive={activeCount > 0}
//       activeCount={activeCount}
//       onClick={() => openSetupDialog(ConnectorType.ONEDRIVE)}
//     />
//   );
// }
