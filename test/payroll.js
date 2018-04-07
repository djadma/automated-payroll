const AutomatedPayroll = artifacts.require('./AutomatedPayroll.sol');
const TestToken = artifacts.require('./TestToken.sol');
const MockReentrant = artifacts.require('./helpers/MockReentrant.sol');
const assertJump = require('./helpers/assertJump');
const ethereumAccounts = require('./helpers/ethereumAccounts.js');
const looper = require('./helpers/looper.js');
const breakCsv = require('./helpers/breakCsv');
const log = require('./helpers/logger.js');
import mockEther from './helpers/mockEther';

contract('EstimateGas', (accounts) => {
  let token;
  let payroll;

  beforeEach(async () => {
    token = await TestToken.new();
    payroll = await AutomatedPayroll.new(token.address);
  });

  it('should allow ether and token payout to 50 receipients using payrollAutomator', async () => {

    const numReceipients = 50;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balance = await payroll.balanceOf.call(payroll.address);

    assert.equal(balance[0].toNumber(), totalEther);
    assert.equal(balance[1].toNumber(), totalEthos);

    const etherBalanceBefore = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesBefore = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    // check call return value before execution
    const callRetVal = await payroll.payout.call(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    assert.equal(callRetVal, true);
    // complete payout
    const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    log(`Cumulative gas cost for payout ${transaction.receipt.cumulativeGasUsed}`);

    const etherBalanceAfter = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesAfter = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    looper.assert_(etherBalanceAfter, etherBalanceBefore, true, etherValue);
    looper.assert_(ethosBalancesAfter, ethosBalancesBefore, true, ethosValue);
  });

  it('should allow ether and token payout to 50 receipients in separate transactions', async () => {

    const numReceipients = 50;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(accounts[0], totalEthos);

    const balance = await token.balanceOf.call(accounts[0]);

    assert.equal(balance.toNumber(), totalEthos);

    const etherBalanceBefore = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesBefore = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    // complete payout
    const gasSendingEther = await looper.callMethod(accounts[0], receipientsEther, web3.eth.sendTransaction, amountEther);
    const gasSendingEthos = await looper.callMethod(accounts[0], receipientsEthos, token.transfer, amountEthos);

    log(`Cumulative gas cost for payout ${gasSendingEthos + gasSendingEther}`);

    const etherBalanceAfter = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesAfter = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    looper.assert_(etherBalanceAfter, etherBalanceBefore, true, etherValue);
    looper.assert_(ethosBalancesAfter, ethosBalancesBefore, true, ethosValue);
  });

  it('should allow ether and token payout using the .csv file', async () => {

    const params = await breakCsv('test/helpers/params.csv')
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    const totalEther = params[1].reduce((a, b) => a + b, 0);
    const totalEthos = params[3].reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balance = await payroll.balanceOf.call(payroll.address);

    assert.equal(balance[0].toNumber(), totalEther);
    assert.equal(balance[1].toNumber(), totalEthos);

    const etherBalanceBefore = await looper.callConstant(params[0], web3.eth.getBalance, true);
    const ethosBalancesBefore = await looper.callConstant(params[2], token.balanceOf, true);

    // check call return value before execution
    const callRetVal = await payroll.payout.call(params[0], params[1], params[2], params[3], {gasPrice: 0});
    assert.equal(callRetVal, true);

    // complete payout
    const transaction = await payroll.payout(params[0], params[1], params[2], params[3], {gasPrice: 0});
    log(`Cumulative gas cost for payout ${transaction.receipt.cumulativeGasUsed}`);

    const etherBalanceAfter = await looper.callConstant(params[0], web3.eth.getBalance, true);
    const ethosBalancesAfter = await looper.callConstant(params[2], token.balanceOf, true);

    looper.assert_(etherBalanceAfter, etherBalanceBefore, true, etherValue);
    looper.assert_(ethosBalancesAfter, ethosBalancesBefore, true, ethosValue);
  });

  it('should allow payment in only ethos if required', async () => {

    const numReceipients = 5;
    const etherValue = 0;
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);

    const balance = await payroll.balanceOf.call(payroll.address);

    assert.equal(balance[0].toNumber(), totalEther);
    assert.equal(balance[1].toNumber(), totalEthos);

    const etherBalanceBefore = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesBefore = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    // check call return value before execution
    const callRetVal = await payroll.payout.call(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    assert.equal(callRetVal, true);

    // complete payout
    const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    log(`Cumulative gas cost for payout ${transaction.receipt.cumulativeGasUsed}`);

    const etherBalanceAfter = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesAfter = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    looper.assert_(etherBalanceAfter, etherBalanceBefore, true, etherValue);
    looper.assert_(ethosBalancesAfter, ethosBalancesBefore, true, ethosValue);
  });

  it('should allow payment in only ether if required', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 0;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balance = await payroll.balanceOf.call(payroll.address);

    assert.equal(balance[0].toNumber(), totalEther);
    assert.equal(balance[1].toNumber(), totalEthos);

    const etherBalanceBefore = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesBefore = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    // check call return value before execution
    const callRetVal = await payroll.payout.call(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    assert.equal(callRetVal, true);

    // complete payout
    const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
    log(`Cumulative gas cost for payout ${transaction.receipt.cumulativeGasUsed}`);

    const etherBalanceAfter = await looper.callConstant(receipientsEther, web3.eth.getBalance, true);
    const ethosBalancesAfter = await looper.callConstant(receipientsEthos, token.balanceOf, true);

    looper.assert_(etherBalanceAfter, etherBalanceBefore, true, etherValue);
    looper.assert_(ethosBalancesAfter, ethosBalancesBefore, true, ethosValue);
  });

  it('should not allow ether and token payout if not owner', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {from: accounts[1], gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if ether receipients length mismatches', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(4);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if ethos receipients length mismatches', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(4);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if amount ethos length mismatches', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(4).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if receipientsEther is zero address', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    receipientsEther.pop();
    receipientsEther.push("0x00");

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if receipientsEthos is zero address', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    receipientsEthos.pop();
    receipientsEthos.push("0x00");

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if ether amount in contract lesser than required', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[1].toNumber(), totalEthos);
  });

  it('should not allow ether and token payout if ethos amount in contract lesser than required', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);

    // try to complete payout
    try {
      const transaction = await payroll.payout(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    const balanceAfter = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceAfter[0].toNumber(), totalEther);
  });

  it('should allow to kill and retrieve funds from the AutomatedPayroll contract', async () => {

    const numReceipients = 50;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balanceBefore = await payroll.balanceOf.call(payroll.address);

    assert.equal(balanceBefore[0].toNumber(), totalEther);
    assert.equal(balanceBefore[1].toNumber(), totalEthos);

    const balanceAccountsBefore = [await web3.eth.getBalance(accounts[0]), await token.balanceOf.call(accounts[0])];

    await payroll.kill(accounts[0], {gasPrice: 0});

    const balanceAccountAfter = [await web3.eth.getBalance(accounts[0]), await token.balanceOf.call(accounts[0])];

    assert.equal(balanceAccountAfter[0].sub(balanceAccountsBefore[0]).toNumber(), balanceBefore[0].toNumber());
    assert.equal(balanceAccountAfter[1].sub(balanceAccountsBefore[1]).toNumber(), balanceBefore[1].toNumber());
  });

  it('should return false when calling payout if any receipient is a contract', async () => {

    const numReceipients = 5;
    const etherValue = mockEther(10).toNumber();
    const ethosValue = 10;

    let receipientsEther = ethereumAccounts(numReceipients);
    let receipientsEthos = ethereumAccounts(numReceipients);
    let contractStatus = Array(numReceipients).fill(false);

    const reentrant = await MockReentrant.new();

    contractStatus.pop();
    contractStatus.push(true);

    receipientsEther.pop();
    receipientsEther.push(reentrant.address);

    const amountEther = Array(numReceipients).fill(etherValue);
    const amountEthos = Array(numReceipients).fill(ethosValue);

    const totalEther = amountEther.reduce((a, b) => a + b, 0);
    const totalEthos = amountEthos.reduce((a, b) => a + b, 0);

    await token.issueTokens(payroll.address, totalEthos);
    await web3.eth.sendTransaction({from: accounts[0], to: payroll.address, value: totalEther});

    const balance = await payroll.balanceOf.call(payroll.address);

    assert.equal(balance[0].toNumber(), totalEther);
    assert.equal(balance[1].toNumber(), totalEthos);

    // complete payout
    try {
      const transaction = await payroll.payout.call(receipientsEther, amountEther, receipientsEthos, amountEthos, {gasPrice: 0});
      assert.fail('should have thrown before');
    } catch (error) {
      assertJump(error);
    }

    // check which address is a contract
    const isContract = await looper.isContract(receipientsEther);
    looper.assert_(contractStatus, isContract);
  });
});
