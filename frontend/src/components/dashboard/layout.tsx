import { Header } from "./header";
import { ConnectorGrid } from "../connectors/base/connector-grid";
import { motion } from "framer-motion";
import { useAppSelector } from "@/lib/store/store";

export function DashboardLayout() {
  const handleOpenChat = () => {
    // Retrieve token from your auth source (Redux, localStorage, etc.)
    // const token = useAppSelector((state) => state.auth.user);
    const token = localStorage.getItem("token") || "";

    // Open in a new tab
    window.open(`http://localhost:5173/auth?token=${token}`, "_blank");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-gray-900">
      <Header />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex overflow-hidden pt-16"
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* <div className="hidden lg:flex flex-col gap-6 w-132 border-r border-gray-800">
            <h2 className="h-3 text-xl font-bold text-slate-600 text-center">
              Chat Integrations
            </h2>
            <ChatConnectors />
          </div> */}
          <div className="flex-1 overflow-hidden p-6">
            <div className="max-w-[1200px] mx-auto h-full flex gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Content area */}
                <div className="h-full rounded-xl bg-gray-800/50 p-6">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-100">
                      Welcome to Your Dashboard
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Connect your data sources and start exploring
                    </p>
                  </div>
                  <div>
                    <div className="relative w-full flex justify-center">
                      {/* The main button with a gradient background */}
                      <button
                        onClick={handleOpenChat}
                        className="
                            w-[70%]
                            px-1
                            py-20
                            bg-gradient-to-r
                            from-purple-800
                            to-purple-951
                            text-white
                            font-semibold
                            rounded-md
                            transition
                            hover:opacity-90
                            italic
                            text-3xl
                          "
                      >
                        Chat me up!
                      </button>
                    </div>
                  </div>
                </div>
                {/* <div className="flex-1 overflow-hidden p-6">
                      <div className="max-w-[1200px] mx-auto h-full flex gap-6">
                        <div className="flex-1">
                          <ChatInterface />
                        </div>
                      </div>
                    </div> 
                */}
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border-t border-gray-800 p-6 bg-gray-900"
          >
            <div className="max-w-[1200px] mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-100 mb-2">
                  Data Connectors
                </h2>
                <p className="text-gray-400">
                  Configure and manage your data sources
                </p>
              </div>
              <ConnectorGrid />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
