// src/components/dashboard/layout.tsx
import { Header } from "./header";
import { ConnectorGrid } from "../connectors/base/connector-grid";
import { ChatInterface } from "../chat/interface";
import { ChatConnectors } from "../chat/chat-connectors";

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Left Sidebar (ChatConnectors) */}
        <div className="hidden lg:flex flex-col gap-6 w-132 border-r border-gray-800">
          <h2 className="text-sm font-medium text-white">
            Integration Options
          </h2>
          <ChatConnectors />
        </div>

        {/* Main Content (ChatInterface) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-6">
            <div className="max-w-[1200px] mx-auto h-full flex gap-6">
              <div className="flex-1">
                <ChatInterface />
              </div>
            </div>
          </div>

          <div className="border-t border-[#0e0e0e] p-6">
            <div className="max-w-[1200px] mx-auto">
              <h2 className="text-sm font-medium text-white">
                Data Connectors
              </h2>
              <ConnectorGrid />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
