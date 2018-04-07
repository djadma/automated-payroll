require('babel-register');
require('babel-polyfill');


module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 9000,
      gas: 4500000,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: 4,
      gas: 4500000,
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,
      gas: '0x6fffffff',
      gasPrice: 0x01
    }
  }
};
