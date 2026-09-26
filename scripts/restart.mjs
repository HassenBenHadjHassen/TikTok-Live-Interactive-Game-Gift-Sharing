import { spawn } from 'node:child_process';
import { killPorts } from './clean-ports.mjs';

const mode = (process.argv[2] || 'all').toLowerCase();

async function restart() {
  if (mode === 'server') {
    console.log('🔄 Restarting backend server (releasing port 3001)...');
    killPorts([3001]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log('🚀 Starting dev:server...\n');
    const child = spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else if (mode === 'game') {
    console.log('🔄 Restarting game client (releasing port 5173)...');
    killPorts([5173]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log('🚀 Starting dev:game...\n');
    const child = spawn('npm', ['run', 'dev:game'], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else {
    console.log('🔄 Restarting full application stack (releasing ports 3001 & 5173)...');
    killPorts([3001, 5173]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log('🚀 Starting full dev environment (server + game)...\n');
    const child = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code ?? 0));
  }
}

restart().catch((err) => {
  console.error('❌ Failed to restart services:', err);
  process.exit(1);
});
