const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3850;
const MEMORY_DIR = path.join(process.env.HOME, 'clawd/memory');

app.use(cors());

function getState() {
  const state = { timestamp: new Date().toISOString(), episodes: [], blackboard: [], procedures: [], reflections: null, stats: {} };
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const episodesFile = path.join(MEMORY_DIR, 'episodes', today + '.jsonl');
    if (fs.existsSync(episodesFile)) {
      state.episodes = fs.readFileSync(episodesFile, 'utf8').trim().split('\n').filter(Boolean).slice(-20).map(l => JSON.parse(l)).reverse();
    }
    
    const bbFile = path.join(MEMORY_DIR, 'blackboard.jsonl');
    if (fs.existsSync(bbFile)) {
      state.blackboard = fs.readFileSync(bbFile, 'utf8').trim().split('\n').filter(Boolean).slice(-10).map(l => JSON.parse(l)).reverse();
    }
    
    const procDir = path.join(MEMORY_DIR, 'procedures');
    if (fs.existsSync(procDir)) {
      state.procedures = fs.readdirSync(procDir).filter(f => f.endsWith('.json')).map(f => {
        const p = JSON.parse(fs.readFileSync(path.join(procDir, f), 'utf8'));
        return { id: p.id, name: p.name, successRate: p.successRate, timesUsed: p.timesUsed };
      });
    }
    
    const refDir = path.join(MEMORY_DIR, 'reflections');
    if (fs.existsSync(refDir)) {
      const files = fs.readdirSync(refDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (files.length > 0) state.reflections = JSON.parse(fs.readFileSync(path.join(refDir, files[0]), 'utf8'));
    }
    
    state.stats = { totalEpisodes: state.episodes.length, unresolvedBlackboard: state.blackboard.filter(b => !b.resolved).length, procedures: state.procedures.length };
  } catch (e) { state.error = e.message; }
  
  return state;
}

app.get('/api/state', (req, res) => {
  res.json(getState());
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    res.write('data: ' + JSON.stringify(getState()) + '\n\n');
  }, 2000);
  
  req.on('close', () => clearInterval(interval));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Kira API: http://localhost:' + PORT);
});
