pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HVtoken is ERC20 {
  constructor() ERC20("HVtoken", "HV") public {
    _mint(msg.sender, 1000);
  }
}