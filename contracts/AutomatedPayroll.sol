pragma solidity ^0.4.13;

import "./Ownable.sol";

interface IERC20 {
    function transfer(address to, uint value) returns (bool ok);
    function balanceOf(address _owner) constant public returns (uint256 balance);
}

contract AutomatedPayroll is Ownable {

  address public tokenAddr;

  event EtherTransfer(address indexed receipient, uint256 amountEther);

  function AutomatedPayroll(address _tokenAddr) {
    tokenAddr = _tokenAddr;
  }

  function balanceOf(address _addr) public constant returns (uint256 etherBalance, uint256 ethosBalance) {
    return(_addr.balance, IERC20(tokenAddr).balanceOf(_addr));
  }

  function payout(address[] _receipientsEther, uint256[] _amountEther, address[] _receipientsEthos, uint256[] _amountEthos) public onlyOwner returns (bool) {
    require(_receipientsEther.length == _amountEther.length);
    require(_receipientsEthos.length == _amountEther.length);
    require(_amountEthos.length == _amountEther.length);

    for(uint i = 0; i < _receipientsEther.length; i++) {
      require(_receipientsEther[i] != address(0));
      require(_receipientsEthos[i] != address(0));
      if(_amountEther[i] != 0) _receipientsEther[i].transfer(_amountEther[i]);
      if(_amountEthos[i] != 0) IERC20(tokenAddr).transfer(_receipientsEthos[i], _amountEthos[i]);
      EtherTransfer(_receipientsEther[i], _amountEther[i]);
    }
    return true;
  }

  function () public payable {

  }

  function kill(address _nextContract) public onlyOwner {
    IERC20(tokenAddr).transfer(_nextContract, IERC20(tokenAddr).balanceOf(address(this)));
    selfdestruct(_nextContract);
  }
}
