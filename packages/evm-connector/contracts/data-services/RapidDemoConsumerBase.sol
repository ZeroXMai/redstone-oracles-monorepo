// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "../core/RedstoneConsumerNumericBase.sol";

contract RapidDemoConsumerBase is RedstoneConsumerNumericBase {
  function getUniqueSignersThreshold() public view virtual override returns (uint256) {
    return 1;
  }

  function getAuthorisedSignerIndex(address _signerAddress)
    public
    view
    virtual
    override
    returns (uint256)
  {
    if (_signerAddress == 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9) {
      return 0;
    } else {
      revert("Signer is not authorised");
    }
  }
}
