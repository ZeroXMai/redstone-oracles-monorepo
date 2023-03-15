// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MentoDataFeedsManager is Ownable {
  using EnumerableMap for EnumerableMap.UintToAddressMap;

  EnumerableMap.UintToAddressMap private dataFeedIdToTokenAddressMap;

  // Adds or updates token address for a given data feed id
  function setDataFeed(bytes32 dataFeedId, address tokenAddress) external onlyOwner {
    dataFeedIdToTokenAddressMap.set(uint256(dataFeedId), tokenAddress);
  }

  function removeDataFeed(bytes32 dataFeedId) external onlyOwner {
    dataFeedIdToTokenAddressMap.remove(uint256(dataFeedId));
  }

  function getDataFeedsCount() public view returns (uint256) {
    return dataFeedIdToTokenAddressMap.length();
  }

  function getTokenAddressByDataFeedId(bytes32 dataFeedId) public view returns (address) {
    return dataFeedIdToTokenAddressMap.get(uint256(dataFeedId));
  }

  function getDataFeedIds() public view returns (bytes32[] memory) {
    uint256 dataFeedsCount = getDataFeedsCount();
    bytes32[] memory dataFeedIds = new bytes32[](dataFeedsCount);
    for (uint256 dataFeedIndex = 0; dataFeedIndex < dataFeedsCount; dataFeedIndex++) {
      (dataFeedIds[dataFeedIndex], ) = getTokenDetailsAtIndex(dataFeedIndex);
    }

    return dataFeedIds;
  }

  function getTokenDetailsAtIndex(
    uint256 tokenIndex
  ) public view returns (bytes32 dataFeedId, address tokenAddress) {
    (uint256 dataFeedIdNumber, address tokenAddress_) = dataFeedIdToTokenAddressMap.at(tokenIndex);
    dataFeedId = bytes32(dataFeedIdNumber);
    tokenAddress = tokenAddress_;
  }
}
