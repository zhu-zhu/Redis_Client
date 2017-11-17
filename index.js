const events = require('events');
const net = require('net');
const fs = require('fs');
const path = require('path');
const RedisProto = require('./proto');

class Redis extends events.EventEmitter {

  constructor(options) {
    super();

    // 默认连接配置
    options = options || {};
    options.host = options.host || '127.0.0.1';
    options.port = options.port || 6379;
    this.options = options;

    // 连接状态
    this._isClosed = false;
    this._isConnected = false;

    // 回调函数列表
    this._callbacks = [];

    this._proto = new RedisProto();

    this.connection = net.createConnection(options.port, options.host, () => {
      this._isConnected = true;
      this.emit('connect');
    });

    this.connection.on('error', err => {
      this.emit('error', err);
    });

    this.connection.on('close', () => {
      this._isClosed = true;
      this.emit('close');
    });

    this.connection.on('end', () => {
      this.emit('end');
    });

    this.connection.on('data', data => {
      this._pushData(data);
    });

    this._bindCommands();
  }

  _bindCommands() {
    const self = this;
    // 绑定命令
    // 从文件读取命令列表
    const cmdList = fs.readFileSync(path.resolve(__dirname, 'cmd.txt')).toString().split('\n');
    for (const cmd of cmdList) {

      // 同时支持大写和小写的函数名
      this[cmd.toLowerCase()] = this[cmd.toUpperCase()] = (key ,callback) => {
        return this.sendCommand(`${cmd} ${key}`,callback)
      }
    }

  }

  // 发送命令给服务器
  sendCommand(cmd, callback) {
    return new Promise((resolve, reject) => {

      const cb = (err, ret) => {
        callback && callback(err, ret);
        err ? reject(err) : resolve(ret);
      };

      // 如果当前连接已断开，直接返回错误
      if (this._isClosed) {
        return cb(new Error('connection has been closed'));
      }

      // 将回调函数添加到队列
      this._callbacks.push(cb);
      // 发送命令
      this.connection.write(`${cmd}\r\n`);

    });
  }

  // 接收到数据，循环结果
  _pushData(data) {

    this._proto.push(data);

    while (this._proto.next()) {

      const result = this._proto.result;
      const cb = this._callbacks.shift();

      if (result.error) {
        cb(new Error(result.error));
      } else {
        cb(null, result.data);
      }

    }

  }

  // 关闭连接
  end() {
    this.connection.destroy();
  }

}

module.exports = Redis;