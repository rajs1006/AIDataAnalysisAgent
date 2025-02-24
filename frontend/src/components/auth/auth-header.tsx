import { motion } from "framer-motion";

export function AuthHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center">
      <img
        src="/icon-192.png"
        alt="Logo"
        className="mx-auto h-12 w-12 rounded-lg transform transition-transform duration-300 hover:scale-110"
      />
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-extrabold text-gray-100"
      >
        Andrual
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-sm text-gray-400"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
