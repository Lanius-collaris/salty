var fs = require('fs')
  , path = require('path')
  , prompt = require('cli-prompt')
  , pempal = require('pempal')
  , libWallet = require('../lib/wallet')
  , loadPubkey = require('../utils/loadPubkey')

function loadWallet (walletDir, cb) {
  fs.readFile(path.join(walletDir, 'id_salty'), {encoding: 'utf8'}, function (err, str) {
    if (err && err.code === 'ENOENT') {
      err = new Error('No salty-wallet found. Type `salty init` to create one.')
      err.code = 'ENOENT'
      return cb(err)
    }
    if (err) return cb(err)
    if (str.indexOf('ENCRYPTED') !== -1) {
      process.stderr.write('Salty-wallet is encrypted.\n')
      process.stderr.write('Enter passphrase: ')
      return prompt.password(null, function (passphrase) {
        console.error()
        withPrompt(passphrase)
      })
    }
    else withPrompt(null)
    function withPrompt (passphrase) {
      try {
        var pem = pempal.decode(str, {tag: 'SALTY WALLET', passphrase: passphrase})
        var wallet = libWallet.parse(pem.body)
      }
      catch (e) {
        return cb(e)
      }
      loadPubkey(walletDir, function (err, pubkey) {
        if (err) return cb(err)
        wallet.pubkey = pubkey
        cb(null, wallet)
      })
    }
  })
}
module.exports = loadWallet