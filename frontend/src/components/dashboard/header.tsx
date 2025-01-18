import { UserNav } from "./user-nav";
import { ThemeToggle } from "../theme-toggle";
import { motion } from "framer-motion";
import { useAppSelector } from "@/lib/store/store";

export function Header() {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-16 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm px-6 flex items-center justify-between fixed top-0 z-50"
    >
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center"
        >
          {/* <div>
            <img
              className="w-10 h-10 rounded-full"
              src="/icon-512.png"
              alt="My icon"
            />
          </div> */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Andrual
          </h1>
          {/* <h1 className="text-xl font-semibold text-gray-200 ml-2">
            Data Agent
          </h1> */}
        </motion.div>
      </div>

      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        {/* <ThemeToggle /> */}
        <UserNav user={user} />
      </motion.div>
    </motion.header>
  );
}
