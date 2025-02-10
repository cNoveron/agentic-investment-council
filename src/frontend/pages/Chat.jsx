import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ChatHistory from '../components/chat/ChatHistory';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

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

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI response with a delay
    setTimeout(() => {
      const aiResponse = getAIResponse(message);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: aiResponse,
        role: 'assistant'
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="h-full">
      <MainLayout>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ChatHistory messages={messages} />
            {isTyping && <TypingIndicator />}
          </div>
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </MainLayout>
    </div>
  );
}