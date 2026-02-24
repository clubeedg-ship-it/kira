import { useParams, useNavigate } from 'react-router-dom';
import LiveCanvas from '../components/LiveCanvas';

export default function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <div className="text-zinc-400 p-8">No canvas ID</div>;

  return (
    <div className="h-full">
      <LiveCanvas canvasId={id} onDismiss={() => navigate('/chat')} />
    </div>
  );
}
