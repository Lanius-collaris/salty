#!/usr/bin/env node
var cli = require('./cli')
  , prompt = require('cli-prompt')
  , addrs = require('email-addresses')
  , fs = require('fs')
  , http = require('http')
  , https = require('https')
  , salty = require('./')
  , path = require('path')
  , pemtools = require('pemtools')
  , prettyjson = require('prettyjson')

var program = require('commander')
  .version(require('./package.json').version)

program
  .command('init')
  .description('initialize a wallet at ~/.salty')
  .action(function (options) {
    prompt('Enter your name (can be blank): ', function (name) {
      (function promptEmail () {
        prompt('Enter your email address (can be fake): ', function (email) {
          if (!email) return promptEmail()
          var parsed = addrs.parseOneAddress(email)
          if (!parsed) {
            console.error('invalid email!')
            return promptEmail()
          }
          if (name) email = '"' + name.replace(/"|'/g, '') + '" <' + parsed.address.toLowerCase() + '>'
          else if (parsed.name) email = '"' + parsed.name.replace(/"|'/g, '') + '" <' + parsed.address.toLowerCase() + '>'
          else email = email.toLowerCase()
          ;(function getPassphrase() {
            prompt('Enter a passphrase (can be blank): ', true, function (passphrase) {
              if (passphrase) {
                prompt('Confirm passphrase: ', true, function (passphrase2) {
                  if (passphrase2 !== passphrase) {
                    console.error('Passwords did not match!')
                    return getPassphrase()
                  }
                  withPassphrase()
                })
              }
              else withPassphrase()
              function withPassphrase () {
                cli.pubkey(email, passphrase, function (err, pubkey) {
                  if (err) throw err
                  console.log('\nHint: Share this string with your peers so they can\n\tsalty import \'<pubkey>\'\nit, and then `salty encrypt` messages to you!\n\n\t' + pubkey + '\n')
                })
              }
            })
          })()
        })
      })()
    })
  })

program
  .command('id')
  .description('output your shareable pubkey string')
  .alias('pubkey')
  .action(function (options) {
    cli.getPubkey(function (err, pubkey) {
      if (err) throw err
      console.log('\nHint: Share this string with your peers so they can\n\tsalty import \'<pubkey>\'\nit, and then `salty encrypt` messages to you!\n\n\t' + pubkey + '\n')
    })
  })

program
  .command('import <pubkey|url|file>')
  .description('import a pubkey')
  .action(function (pubkey, options) {
    if (pubkey.indexOf('https:') === 0) {
      withGet(https.get, withPubkey)
    }
    else if (pubkey.indexOf('http:') === 0) {
      withGet(http.get, withPubkey)
    }
    else if (pubkey.indexOf('salty-id') === 0) {
      withPubkey(pubkey)
    }
    else {
      fs.readFile(pubkey, {encoding: 'utf8'}, function (err, contents) {
        if (err) throw err
        withPubkey(contents)
      })
    }
    function withGet (get, cb) {
      get(pubkey, function (res) {
        if (res.statusCode !== 200) {
          throw new Error('non-200 status code from remote server: ' + resp.statusCode)
        }
        res.setEncoding('utf8')
        var body = ''
        res.on('data', function (chunk) {
          body += chunk
        })
        res.on('end', function () {
          cb(body)
        })
        res.resume()
      }).on('error', function (err) {
        throw err
      })
    }
    function withPubkey (pubkey) {
      cli.import(pubkey, function (err, pubkey) {
        if (err) throw err
        console.log('imported OK')
      })
    }
  })

program
  .command('encrypt <infile> [outfile]')
  .description('sign and encrypt a file into a ".salty" file')
  .option('-t, --to <email>', 'email address to encrypt for. (must be imported first. default: self)')
  .option('--nonce <nonce>, -n', 'use a specific nonce (base64-encoded)')
  .option('-F, --force', 'ignore warnings and do it')
  .option('-D, --delete', 'delete the original file after encryption')
  .action(function (infile, outfile, options) {
    outfile || (outfile = infile + '.salty')
    cli.encrypt(
      options.to,
      infile,
      outfile,
      options.nonce ? salty.decode(options.nonce) : null,
      options.force,
      options.delete
    )
  })

program
  .command('decrypt <infile> [outfile]')
  .description('decrypt and verify a ".salty" file')
  .option('-F, --force', 'ignore warnings and do it')
  .option('-D, --delete', 'delete the salty file after verification')
  .action(function (infile, outfile, options) {
    var ext = path.extname(infile)
    if (!outfile && ext !== '.salty') {
      throw new Error('<infile> is not a .salty file. specify [outfile] to ignore this.')
    }
    outfile || (outfile = infile.replace(/\.salty$/, ''))
    cli.decrypt(
      infile,
      outfile,
      options.force,
      options.delete
    )
  })

program
  .command('header <infile>')
  .alias('headers')
  .description('view the headers of a ".salty" file')
  .action(function (infile) {
    cli.headers(infile, function (err, header) {
      if (err) throw err
      console.log(prettyjson.render(header, {
        noColor: false,
        keysColor: 'blue',
        dashColor: 'magenta',
        stringColor: 'grey'
      }))
    })
  })

program
  .command('ls')
  .description('list imported keys')
  .action(function () {
    cli.ls()
  })

program
  .command('save [indir] [outfile]')
  .description('save an encrypted backup of your wallet')
  .action(function (indir, outfile) {
    (function getPassphrase () {
      prompt.password('Create a passphrase: ', function (passphrase) {
        prompt('Confirm passphrase: ', true, function (passphrase2) {
          if (passphrase2 !== passphrase) {
            console.error('Passwords did not match!')
            return getPassphrase()
          } 
          cli.save(passphrase, indir, outfile)
        })
      })
    })()
  })

program
  .command('restore [infile] [outdir]')
  .description('restore your wallet from a backup')
  .action(function (infile, outdir) {
    cli.restore(infile, outdir)
  })

program
  .command('*')
  .action(function (infile) {
    program.outputHelp();
  })

program.parse(process.argv)

if (!program.args.length) {
  program.outputHelp()
}