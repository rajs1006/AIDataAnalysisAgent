import { motion } from "framer-motion";
import { Button } from "../ui/button";

interface ChatButtonProps {
  onClick: () => void;
}

const BaseChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Open Chat
    </Button>
  );
};

// Enhanced version with animation
export const EnhancedChatButton: React.FC<ChatButtonProps> = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <BaseChatButton {...props} />
    </motion.div>
  );
};
