pragma solidity ^0.4.13;

interface IAutomatedPayroll {
  function payout(address[1] _receipientsEther, address[1] _receipientsEthos, uint256[1] _amountEther, uint256[1] _amountEthos) public;
}

contract MockReentrant {
  function () public payable {
    IAutomatedPayroll(msg.sender).payout([address(this)], [address(this)], [uint256(1e18)], [uint256(1)]);
  }
}
