import http from 'node:http';

/**
 * Triggers the /api/reset endpoint on the local game server to restart the active Snake round.
 */
function resetRound() {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/reset',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('🐍 Round successfully restarted on server!');
        } else {
          console.warn(`Server responded with status ${res.statusCode}: ${data}`);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error('❌ Could not connect to game server on port 3001. Is it running?');
    console.error(`   Run "npm run restart" or "npm run dev" first.`);
  });

  req.end();
}

resetRound();
