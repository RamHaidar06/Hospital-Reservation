import { useCallback, useState } from "react";
import { apiFetch } from "../API/http";

function getInitialBotMessage(userRole, currentUser) {
  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ").trim();
  const namePrefix = displayName ? `${displayName}, ` : "";

  return {
    id: "init",
    type: "bot",
    text:
      userRole === "doctor"
        ? `Hello Doctor${displayName ? ` ${displayName}` : ""}. I am your Gemini Secretary. Ask me anything about appointments, clinic workflow, or general guidance.`
        : `Hello ${namePrefix}I am your Gemini Secretary. Ask me anything about the site, appointments, or general health guidance.`,
    quickReplies: [
      { label: "What can you help with?", id: "help" },
      { label: "Appointments", id: "appointments" },
      { label: "Website help", id: "website" },
      { label: "Health guidance", id: "health" },
    ],
  };
}

function buildPrompt(messages, userText, userRole) {
  const recentMessages = messages
    .filter((msg) => msg.id !== "init")
    .slice(-8)
    .map((msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n");

  const roleContext =
    userRole === "doctor"
      ? "You are Gemini, assisting a doctor on a medical appointment website. Keep replies concise, practical, and friendly. Help with appointments, clinic workflow, and general guidance. Do not pretend to book or change appointments unless the website can actually do it."
      : "You are Gemini, assisting a patient on a medical appointment website. Keep replies concise, practical, and friendly. Help with appointments, website navigation, and general health guidance. Do not diagnose conditions; encourage professional care when appropriate.";

  return `${roleContext}\n\nConversation so far:\n${recentMessages || "No prior messages."}\n\nUser: ${userText}\nAssistant:`;
}

export default function useAppointmentChatbot(currentUser, userRole = "patient") {
  const [messages, setMessages] = useState([getInitialBotMessage(userRole, currentUser)]);
  const [loading, setLoading] = useState(false);

  const pushUserMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const pushBotMessage = useCallback((text, quickReplies = null) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        type: "bot",
        text,
        quickReplies,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const submitTextMessage = useCallback(
    async (text) => {
      const raw = String(text || "").trim();
      if (!raw || loading) return;

      pushUserMessage(raw);
      setLoading(true);

      try {
        const data = await apiFetch("/chat", {
          method: "POST",
          body: JSON.stringify({
            message: raw,
            history: messages.slice(-10).map((msg) => ({
              role: msg.type === "user" ? "user" : "assistant",
              text: msg.text,
            })),
            userRole,
            user: currentUser
              ? {
                  name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim(),
                  email: currentUser.email,
                }
              : null,
          }),
        });

        pushBotMessage(data.reply || "I’m sorry, I couldn’t generate a reply right now.");
      } catch (error) {
        console.error("Gemini chat error:", error);
        const msg = String(error?.message || "").trim();
        pushBotMessage(msg ? `Gemini request failed: ${msg}` : "I could not reach Gemini right now. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pushBotMessage, pushUserMessage, userRole, currentUser]
  );

  const selectQuickReply = useCallback(
    (replyId) => {
      const quickReplyMap = {
        help: "What can you help with?",
        appointments: "How can you help me with appointments?",
        website: "How do I use this website?",
        health: "Give me general health guidance.",
      };

      const text = quickReplyMap[replyId] || replyId;
      submitTextMessage(text);
    },
    [submitTextMessage]
  );

  const resetChat = useCallback(() => {
    setMessages([getInitialBotMessage(userRole, currentUser)]);
  }, [currentUser, userRole]);

  return {
    messages,
    loading,
    submitTextMessage,
    selectQuickReply,
    resetChat,
    pushBotMessage,
    pushUserMessage,
  };
}
