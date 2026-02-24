export interface ChatPanelProps {
    conversationId: string;
    agentName?: string;
    modelName?: string;
    showHeader?: boolean;
    onClose?: () => void;
}
export default function ChatPanel({ conversationId, agentName, modelName, showHeader, onClose }: ChatPanelProps): import("react/jsx-runtime").JSX.Element;
