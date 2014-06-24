var salty = require('./')
  , wallet = salty.wallet()
  , packer = require('./packer')

packer.connect({port: 8000}, function (socket) {
  socket.on('data', function (data) {
    console.error('client was talked to', data.toString());
  });
  socket.write(Buffer('my name is carlos'));
});
