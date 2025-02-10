import { useState } from 'react';

export default function ChatInput({ onSendMessage }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--color-surface)]">
      <div className="flex space-x-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="button-primary px-4 py-2 rounded-lg"
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}