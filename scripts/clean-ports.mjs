import { execSync } from 'node:child_process';

/**
 * Forcefully kills any process listening on the specified port.
 * Works seamlessly on Windows (PowerShell + netstat fallback) and Unix/macOS.
 */
export function killPort(port) {
  const isWindows = process.platform === 'win32';
  try {
    if (isWindows) {
      // 1. Try PowerShell Get-NetTCPConnection (most accurate on Windows)
      try {
        execSync(
          `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
          { stdio: 'ignore' }
        );
      } catch {
        // 2. Fallback to netstat + taskkill if powershell fails or is restricted
        const netstatOutput = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
        const lines = netstatOutput.split('\n');
        const pids = new Set();
        for (const line of lines) {
          if (line.includes(`:${port} `) && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== String(process.pid)) {
              pids.add(pid);
            }
          }
        }
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch {}
        }
      }
    } else {
      // Unix / macOS
      try {
        execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}

export function killPorts(ports = [3001, 5173]) {
  for (const port of ports) {
    killPort(port);
  }
}

// Direct execution CLI support: node scripts/clean-ports.mjs [ports...]
if (process.argv[1] && process.argv[1].endsWith('clean-ports.mjs')) {
  const args = process.argv.slice(2).map(Number).filter(Boolean);
  const ports = args.length > 0 ? args : [3001, 5173];
  console.log(`🧹 Freeing ports: ${ports.join(', ')}...`);
  killPorts(ports);
  console.log(`✅ Ports cleared.`);
}
