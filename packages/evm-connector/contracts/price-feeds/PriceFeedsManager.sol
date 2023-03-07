// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../data-services/MainDemoConsumerBase.sol";
import "./DefaultsLib.sol";

contract PriceFeedsManager is MainDemoConsumerBase, Ownable {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  uint256 public lastRound = 0;
  uint256 public lastUpdateTimestampMilliseconds = 0;
  EnumerableSet.Bytes32Set private dataFeedsIds;
  mapping(bytes32 => uint256) dataFeedsValues;

  constructor(bytes32[] memory dataFeedsIds_) {
    for (uint256 i = 0; i < dataFeedsIds_.length; i++) {
      EnumerableSet.add(dataFeedsIds, dataFeedsIds_[i]);
    }
  }

  function validateTimestamp(uint256 receivedTimestampMilliseconds) public view override {
    RedstoneDefaultsLib.validateTimestamp(receivedTimestampMilliseconds);
    /* 
      Here lastUpdateTimestampMilliseconds is already updated inside updateDataFeedValues
      after validation in valivalidateTimestampFromUser and equal to proposedTimestamp
    */
    if (receivedTimestampMilliseconds != lastUpdateTimestampMilliseconds) {
      revert DefaultsLib.ProposedTimestampDoesNotMatchReceivedTimestamp(
        lastUpdateTimestampMilliseconds,
        receivedTimestampMilliseconds
      );
    }
  }

  function validateProposedTimestamp(uint256 proposedTimestamp) private view {
    if (proposedTimestamp <= lastUpdateTimestampMilliseconds) {
      revert DefaultsLib.ProposedTimestampSmallerOrEqualToLastTimestamp(
        proposedTimestamp,
        lastUpdateTimestampMilliseconds
      );
    }
  }

  function addDataFeedId(bytes32 newDataFeedId) public onlyOwner {
    EnumerableSet.add(dataFeedsIds, newDataFeedId);
  }

  function removeDataFeedId(bytes32 dataFeedIdToRemove) public onlyOwner {
    EnumerableSet.remove(dataFeedsIds, dataFeedIdToRemove);
  }

  function isProposedRoundValid(uint256 proposedRound) private view returns (bool) {
    return proposedRound == lastRound + 1;
  }

  function getLastRound() public view returns (uint256) {
    return lastRound;
  }

  function getLastUpdateTimestamp() public view returns (uint256) {
    return lastUpdateTimestampMilliseconds;
  }

  function getLastRoundParams() public view returns (uint256, uint256) {
    return (lastRound, lastUpdateTimestampMilliseconds);
  }

  function getDataFeedsIds() public view returns (bytes32[] memory) {
    return dataFeedsIds._inner._values;
  }

  function updateDataFeedValues(uint256 proposedRound, uint256 proposedTimestamp) public {
    if (!isProposedRoundValid(proposedRound)) return;
    lastRound = proposedRound;
    validateProposedTimestamp(proposedTimestamp);
    lastUpdateTimestampMilliseconds = proposedTimestamp;

    /* 
      getOracleNumericValuesFromTxMsg will call validateTimestamp
      for each data package from the redstone payload 
    */
    bytes32[] memory dataFeedsIdsArray = dataFeedsIds._inner._values;
    uint256[] memory values = getOracleNumericValuesFromTxMsg(dataFeedsIdsArray);
    for (uint256 i = 0; i < dataFeedsIdsArray.length; i++) {
      dataFeedsValues[dataFeedsIdsArray[i]] = values[i];
    }
  }

  function getValueForDataFeed(bytes32 dataFeedId) public view returns (uint256) {
    uint256 dataFeedValue = dataFeedsValues[dataFeedId];
    if (dataFeedValue == 0) {
      revert DefaultsLib.DataFeedValueCannotBeZero(dataFeedId);
    }
    return dataFeedValue;
  }

  function getValueForDataFeedAndLastRoundParams(bytes32 dataFeedId)
    public
    view
    returns (
      uint256 dataFeedValue,
      uint256 lastRoundNumber,
      uint256 lastUpdateTimestampInMilliseconds
    )
  {
    dataFeedValue = getValueForDataFeed(dataFeedId);
    lastRoundNumber = lastRound;
    lastUpdateTimestampInMilliseconds = lastUpdateTimestampMilliseconds;
  }

  function getValuesForDataFeeds(bytes32[] memory dataFeedsIds_)
    public
    view
    returns (uint256[] memory)
  {
    uint256[] memory values = new uint256[](dataFeedsIds_.length);
    for (uint256 i = 0; i < dataFeedsIds_.length; i++) {
      values[i] = getValueForDataFeed(dataFeedsIds_[i]);
    }
    return (values);
  }
}
