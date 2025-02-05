import { useState, useEffect } from 'react';

export function useCooldown(cooldownTime: number = 60) {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isActive && remainingTime > 0) {
      intervalId = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, remainingTime]);

  const startCooldown = () => {
    setRemainingTime(cooldownTime);
    setIsActive(true);
  };

  const resetCooldown = () => {
    setRemainingTime(0);
    setIsActive(false);
  };

  return {
    remainingTime,
    isActive,
    startCooldown,
    resetCooldown
  };
}
