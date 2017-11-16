'use strict';

const Redis = require('./index');
const client = new Redis();

client.sendCommand('GET a', (err, ret) => {
  console.log('a=%s, err=%s', ret, err);
});

client.sendCommand('GET b', (err, ret) => {
  console.log('b=%s, err=%s', ret, err);
});

client.sendCommand('KEYS *IO*', (err, ret) => {
  console.log('KEYS *IO*=%s, err=%s', ret, err);
});

client.sendCommand('OOXX', (err, ret) => {
  console.log('OOXX=%s, err=%s', ret, err);
});

client.sendCommand('SET a ' + Date.now())
  .then(ret => console.log('success', ret))
  .catch(err => console.log('error', err))
  .then(() => client.end());