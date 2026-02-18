import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetch("/api/state")
      .then(r => r.json())
      .then(data => {
        setState(data);
        setConnected(true);
      })
      .catch(e => setError(e.message));

    // SSE for updates
    const evtSource = new EventSource("/api/stream");
    evtSource.onmessage = (e) => {
      setState(JSON.parse(e.data));
      setConnected(true);
    };
    evtSource.onerror = () => setConnected(false);
    return () => evtSource.close();
  }, []);

  if (error) return <div className="error">Error: {error}</div>;
  if (!state) return <div className="loading">Connecting to Kira's Mind...</div>;

  return (
    <div className="mind-container">
      <header>
        <h1>⚡ Kira's Mind</h1>
        <span className={connected ? "status live" : "status offline"}>
          {connected ? "● LIVE" : "○ OFFLINE"}
        </span>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>📝 Episodes ({state.stats?.totalEpisodes || 0})</h2>
          <div className="scroll-area">
            {state.episodes && state.episodes.length > 0 ? (
              state.episodes.map((ep) => (
                <div key={ep.id} className={"episode " + (ep.outcome || "") + (ep.type === "milestone" ? " milestone" : "")}>
                  <div className="time">{new Date(ep.timestamp).toLocaleTimeString()} • {ep.type}</div>
                  <div className="summary">{ep.summary}</div>
                  {ep.tags && ep.tags.length > 0 && (
                    <div className="tags">
                      {ep.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <em>No episodes today yet</em>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>📋 Blackboard ({state.stats?.unresolvedBlackboard || 0} unresolved)</h2>
          <div className="scroll-area">
            {state.blackboard && state.blackboard.length > 0 ? (
              state.blackboard.map((bb) => (
                <div key={bb.id} className={"bb-item" + (bb.resolved ? "" : " unresolved")}>
                  <div className="meta">{bb.type} • {bb.topic} • {bb.agent}</div>
                  <div className="content">{bb.content}</div>
                </div>
              ))
            ) : (
              <em>Blackboard empty</em>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>🧠 Reflection</h2>
          <div className="scroll-area">
            {state.reflections ? (
              <>
                <div className="timestamp">Last: {new Date(state.reflections.timestamp).toLocaleString()}</div>
                <div className="stats">
                  {state.reflections.stats?.total || 0} events • {Math.round((state.reflections.stats?.successRate || 0) * 100)}% success
                </div>
                <div className="insights">
                  {state.reflections.insights && state.reflections.insights.map((i, idx) => (
                    <div key={idx} className="insight">{i.content}</div>
                  ))}
                </div>
              </>
            ) : (
              <em>No reflection yet</em>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>📦 Procedures ({state.stats?.procedures || 0})</h2>
          <div className="scroll-area">
            {state.procedures && state.procedures.length > 0 ? (
              state.procedures.map((p) => (
                <div key={p.id} className="procedure">
                  <span>{p.name}</span>
                  <span className="meta">{p.timesUsed}x • {p.successRate !== null ? Math.round(p.successRate * 100) + "%" : "new"}</span>
                </div>
              ))
            ) : (
              <em>No procedures learned</em>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
