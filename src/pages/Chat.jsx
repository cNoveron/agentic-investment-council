import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ChatHistory from '../components/chat/ChatHistory';
import ChatInput from '../components/chat/ChatInput';

export default function Chat() {
  const [messages, setMessages] = useState([]);

  const handleSendMessage = (message) => {
    setMessages([...messages, {
      id: Date.now(),
      content: message,
      role: 'user'
    }]);
    // Add AI response logic here
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