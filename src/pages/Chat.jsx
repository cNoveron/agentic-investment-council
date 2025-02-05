import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ChatHistory from '../components/chat/ChatHistory';
import ChatInput from '../components/chat/ChatInput';

export default function Chat() {
  const [messages, setMessages] = useState([]);

  const mockAIResponses = {
    hello: "Hello! How can I help you today?",
    default: "I understand. Please tell me more about that.",
    help: "I'm here to help! What would you like to know?",
    thanks: "You're welcome! Is there anything else you'd like to discuss?",
    bye: "Goodbye! Have a great day!",
  };

  const getAIResponse = (userMessage) => {
    const lowercaseMsg = userMessage.toLowerCase();

    if (lowercaseMsg.includes('hello') || lowercaseMsg.includes('hi')) {
      return mockAIResponses.hello;
    } else if (lowercaseMsg.includes('help')) {
      return mockAIResponses.help;
    } else if (lowercaseMsg.includes('thank')) {
      return mockAIResponses.thanks;
    } else if (lowercaseMsg.includes('bye')) {
      return mockAIResponses.bye;
    }
    return mockAIResponses.default;
  };

  const handleSendMessage = (message) => {
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      content: message,
      role: 'user'
    }]);

    // Simulate AI response with a delay
    setTimeout(() => {
      const aiResponse = getAIResponse(message);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: aiResponse,
        role: 'assistant'
      }]);
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-screen">
        <ChatHistory messages={messages} />
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </MainLayout>
  );
}