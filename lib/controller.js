"use strict";

var through = require('through2');
var nss_deploy = require('./nss_deploy.js');
var Tx = require('ethereumjs-tx');
var Web3Interface = require('dapple-core/web3Interface.js');
var cls = require('../spec/nss.json');
var Server = require('dapple-chain/lib/server.js');

module.exports = {
  cli: function (state, cli, BuildPipeline) {
    if(cli.run) {
      let scriptname = cli['<script>'];
      var chainenv = state.state.pointers[state.state.head];
      // TODO - refactor build pipeline to own module
      BuildPipeline({
        modules: state.modules,
        optimize: !cli['--no-optimize'],
        packageRoot: state.workspace.package_root,
        subpackages: cli['--subpackages'] || cli['-s'],
        state
      })
      .pipe(through.obj(function (file, enc, cb) {
        if (file.basename === 'classes.json') {
          nss_deploy({
            scriptname,
            state,
            chainenv,
            classes: JSON.parse(String(file.contents))
          });
        } else {
          cb();
        }
      }));
    } else if(cli.deposit) {
      var chainenv = state.state.pointers[state.state.head];
      if(chainenv.type !== 'MORDEN') {
        console.log("You can only perform this action from a MORDEN environment");
        return null;
      }

      new Web3Interface({chainenv}, null, (err, web3Interface) => {
        var NSS = web3Interface._web3.eth.contract(JSON.parse(cls.NSS.interface));
        var nss = NSS.at("0xb7ca1acd4b82155adf299fd77198f47ffb8e460a");
        var data = nss.deposit.getData();
        var addr = '0x' + state.wallet.getAddress().toString("hex");
        var count = web3Interface._web3.eth.getTransactionCount(addr, "latest");
        var toHex = web3Interface._web3.toHex;

        var rawTx = {
          nonce: toHex(count),
          data: data,
          from: addr,
          gasPrice: '0x4a817c800',
          gasLimit: '0x186a0',
          value: toHex(cli['<wei>']),
          to: "0xb7ca1acd4b82155adf299fd77198f47ffb8e460a"
        };
        var tx = new Tx(rawTx);
        tx.sign(state.wallet.getPrivateKey());
        var serializedTx = tx.serialize();
        web3Interface._web3.eth.sendRawTransaction("0x"+serializedTx.toString('hex'), (err, hash) => {
          console.log(err, hash);
        });
      });

    } else if(cli.withdraw) {
      if(chainenv.type !== 'MORDEN') {
        console.log("You can only perform this action from a MORDEN environment");
        return null;
      }
    } else if(cli.balance) {
      var chainenv = state.state.pointers[state.state.head];
      if(chainenv.type !== 'MORDEN') {
        console.log("You can only perform this action from a MORDEN environment");
        return null;
      }
      new Web3Interface({chainenv}, null, (err, web3Interface) => {
        var NSS = web3Interface._web3.eth.contract(JSON.parse(cls.NSS.interface));
        var nss = NSS.at("0xb7ca1acd4b82155adf299fd77198f47ffb8e460a");
        var addr = '0x' + state.wallet.getAddress().toString("hex");
        var bal = nss.balances(addr);
        console.log(addr, web3Interface._web3.fromWei(bal.toString(10), "ether"),"ether");
      });
    } else if(cli.server) {
      // TODO - assert on internal chain
      console.log("woob woob");
      var options = {
        port: 8540,
        logger: console,
        packageRoot: state.workspace.package_root,
        state
      }
      var options = {
        VM,
        port: 8540,
        logger: console,
        packageRoot: state.workspace.package_root,
        state,
        chainenv: config.chainenvs.NSS,
        ds: {
          origin: config.chainenvs.MORDEN.defaultAccount,
          iface,
          chainenv: config.chainenvs.MORDEN,
          web3Interface,
          libs,
          expert,
          logStep,
        }
      }
      var server = Server.server.apply(Server, [options]);
      server.listen(8540, (err, blockchain) => {
        console.log(`open on 8545`);
      });
    }
  }
}
