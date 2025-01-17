import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  // You can add other props here if needed
}

export function EnhancedChatButton({ onClick }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsClicked(true);

    // Create ripple effect before actually invoking `onClick`
    setTimeout(() => {
      setIsClicked(false);

      // Guard for `undefined` with optional chaining
      onClick?.(event);
    }, 600);
  };

  return (
    <div className="relative w-full flex justify-center">
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 w-[70%] mx-auto rounded-md"
        animate={{
          boxShadow: isHovered
            ? "0 0 40px 5px rgba(147, 51, 234, 0.3)"
            : "0 0 20px 0px rgba(147, 51, 234, 0)",
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Main button */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-[70%] px-1 py-20 bg-gradient-to-r from-purple-800 to-purple-950
                   text-white font-semibold rounded-md overflow-hidden z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          background: isHovered
            ? "linear-gradient(to right, #6b21a8, #581c87)"
            : "linear-gradient(to right, #581c87, #3b0765)",
        }}
      >
        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-md"
          animate={{
            border: isHovered
              ? "2px solid rgba(147, 51, 234, 0.5)"
              : "2px solid transparent",
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Particle effects on hover */}
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-300 rounded-full"
                  initial={{
                    opacity: 0,
                    x: "50%",
                    y: "50%",
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: ["50%", `${50 + (Math.random() * 100 - 50)}%`],
                    y: ["50%", `${50 + (Math.random() * 100 - 50)}%`],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Ripple effect on click */}
        <AnimatePresence>
          {isClicked && (
            <motion.div
              className="absolute inset-0 bg-purple-400"
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ borderRadius: "100%", transformOrigin: "center" }}
            />
          )}
        </AnimatePresence>

        {/* Button text with animation */}
        <motion.span
          className="relative z-10 text-3xl italic"
          animate={{
            textShadow: isHovered
              ? "0 0 8px rgba(255,255,255,0.5)"
              : "0 0 0px rgba(255,255,255,0)",
          }}
        >
          Chat me up!
        </motion.span>

        {/* Subtle floating animation */}
        <motion.div
          className="absolute inset-0 opacity-50"
          animate={{
            background: [
              "linear-gradient(45deg, transparent 0%, rgba(147, 51, 234, 0.9) 50%, transparent 100%)",
              "linear-gradient(45deg, transparent 100%, rgba(147, 51, 234, 0.1) 50%, transparent 0%)",
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </motion.button>
    </div>
  );
}
