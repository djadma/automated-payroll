const bitcore = require('bitcore-lib');
const EthereumBip44 = require('ethereum-bip44');

module.exports =  function(numAccounts) {
    const key = bitcore.HDPrivateKey();
    const wallet = new EthereumBip44(key);
    let receipients = [];
    for (let i = 0; i < numAccounts; i++) {
      receipients.push(wallet.getAddress(i));
    }
  return receipients;
}
