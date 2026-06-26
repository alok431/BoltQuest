const https = require('https');

const url = 'https://bolt-quest.vercel.app/assets/index-ade_FHIT.js';

function downloadJS() {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (e) => {
      reject(e.message);
    });
  });
}

async function run() {
  console.log(`Downloading JS bundle from ${url}...`);
  try {
    const js = await downloadJS();
    console.log(`JS Bundle downloaded. Length: ${js.length} bytes.`);
    
    // Search for localhost or render URLs in the bundled JS
    const hasLocalhost = js.includes('localhost:5000');
    const hasRender = js.includes('boltquest.onrender.com');
    
    console.log(`Contains 'localhost:5000':`, hasLocalhost);
    console.log(`Contains 'boltquest.onrender.com':`, hasRender);
    
    // Find some snippets around localhost or render
    if (hasLocalhost) {
      const idx = js.indexOf('localhost:5000');
      console.log('Localhost snippet:', js.slice(idx - 50, idx + 50));
    }
    if (hasRender) {
      const idx = js.indexOf('boltquest.onrender.com');
      console.log('Render snippet:', js.slice(idx - 50, idx + 50));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
