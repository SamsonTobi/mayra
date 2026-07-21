import { ChatWindow } from "@/components/chat/ChatWindow";
import { WebAuthGate } from "@/components/common/WebAuthGate";

export default function HomePage() {
  return (
    <WebAuthGate>
      <ChatWindow />
    </WebAuthGate>
  );
}
