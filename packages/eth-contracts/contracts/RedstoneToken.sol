// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RedstoneToken
 * @dev Standard implementation of ERC20 for Redstone token
 */
contract RedstoneToken is ERC20 {
  uint256 constant MAX_SUPPLY = 50_000_000e18;

  address public minter;

  constructor(uint256 initialSupply) ERC20("Redstone", "REDSTONE") {
    _mint(msg.sender, initialSupply);
    minter = msg.sender;
  }

  function mint(address account, uint256 amount) external {
    require(msg.sender == minter, "RedstoneToken: minting by an unatuthorized address");
    _mint(account, amount);
    require(totalSupply() <= MAX_SUPPLY, "RedstoneToken: cannot mint more than MAX SUPPLY");
  }

  function updateMinter(address newMinter) external {
    require(msg.sender == minter, "RedstoneToken: minter update by an unatuthorized address");
    minter = newMinter;
  }
}
