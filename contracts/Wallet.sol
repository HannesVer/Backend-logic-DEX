pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Wallet is Ownable {
  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }
  mapping(bytes32 => Token) public tokenMapping;
  bytes32[] public tokenList;
  mapping(address => mapping(bytes32 => uint256)) public balances;

  modifier tokenExist(bytes32 ticker) {
    require(tokenMapping[ticker].tokenAddress != address(0));
    _;
  }

  function addToken(bytes32 ticker, address tokenAddress) onlyOwner external {
    tokenMapping[ticker] = Token(ticker, tokenAddress);
    tokenList.push(ticker);
  }

  function depositEth() payable external {
    balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")] + msg.value;
  }

  function deposit(uint amount, bytes32 ticker) tokenExist(ticker) external {
    IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    balances[msg.sender][ticker] = balances[msg.sender][ticker] + amount;
  }

  function withdraw(uint amount, bytes32 ticker) tokenExist(ticker) external {
    require(balances[msg.sender][ticker] >= amount,"this balance is not sufficient");
    balances[msg.sender][ticker] = balances[msg.sender][ticker] + amount;
    IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);

  }

}