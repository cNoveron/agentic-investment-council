export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isUser
          ? 'bg-[var(--color-primary)]'
          : 'bg-[var(--color-surface)]'
      }`}>
        <p className="text-[var(--color-text-primary)]">
          {message.content}
        </p>
      </div>
    </div>
  );
}