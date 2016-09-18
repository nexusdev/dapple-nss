"use strict";
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8540"));
var http = require('http');
var LogTranslator = require('dapple-core/logtranslator.js');
var _ = require('lodash');
var Tx = require('ethereumjs-tx');

function teachEverybody(what, cb) {
  var options = {
    hostname: 'localhost',
    port: 8540,
    method: 'POST'
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      // console.log('body:\n' + chunk);
    });
    res.on('end', function () {
      cb(null, true);
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  req.write(`{"jsonrpc":"2.0","method":"expert_learn","params":[${JSON.stringify(what)}],"id":1}`);
  req.end();
}

module.exports = function (opts) {
  teachEverybody( opts.classes, () => {
    var script = opts.classes[opts.scriptname];
    var logtr = new LogTranslator(JSON.parse(script.interface));
    var addr = '0x' + opts.state.wallet.getAddress().toString("hex");
    web3.eth.getTransactionCount(addr, (err, nonce) => {
      var rawTx = {
        nonce: nonce,
        data: "0x"+script.bytecode,
        from: addr,
        gasPrice: '0x4a817c800',
        gasLimit: '0x5f5e100',
        value: '0x00'
      };
      var tx = new Tx(rawTx);
      tx.sign(opts.state.wallet.getPrivateKey());
      var serializedTx = tx.serialize();
      web3.eth.sendRawTransaction(serializedTx, (err, hash) => {
      // web3.eth.sendTransaction(rawTx, (err, hash) => {
        if(err) return console.log(err);
        web3.eth.getTransactionReceipt(hash, (err, receipt) => {
          console.log(err, receipt);
          var logs = logtr.translateAll(receipt.logs);
          logs = logs.map(l => {
            var args = (l) => _.map(l.args, (value, key) => ` |  ${key}: ${value}`).join('\n');
            return ` ${l.event}\n${args(l)}`;
          });
          console.log(logs.join('\n\n'));
        })
      });
    });
  });
}
