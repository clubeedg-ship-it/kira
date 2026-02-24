import { jsx as _jsx } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import LiveCanvas from '../components/LiveCanvas';
export default function CanvasPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    if (!id)
        return _jsx("div", { className: "text-zinc-400 p-8", children: "No canvas ID" });
    return (_jsx("div", { className: "h-full", children: _jsx(LiveCanvas, { canvasId: id, onDismiss: () => navigate('/chat') }) }));
}
//# sourceMappingURL=CanvasPage.js.map