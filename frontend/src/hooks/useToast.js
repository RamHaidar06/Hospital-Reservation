import { useRef, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const toastTimer = useRef(null);

  function showMessage(message, type = "success") {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast({
      show: true,
      type,
      message,
    });

    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false,
      }));
    }, 3000);
  }

  return {
    toast,
    showMessage,
  };
}