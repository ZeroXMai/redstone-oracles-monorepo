// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.4;

import "../core/RedstoneAdapterBase.sol";

abstract contract PriceFeedsAdapterBase is RedstoneAdapterBase {
  // Note! This function is virtual and may contain additional logic in the derived contract
  // For example it can check if the updating conditions are met (e.g. at least one value is deviated enough)
  function validateAndUpdateDataFeedsValues(
    bytes32[] memory dataFeedsIdsArray,
    uint256[] memory values
  ) internal virtual override {
    for (uint256 i = 0; i < dataFeedsIdsArray.length; i++) {
      bytes32 dataFeedId = dataFeedsIdsArray[i];
      updateDataFeedValue(dataFeedId, values[i]);
    }
  }

  function updateDataFeedValue(bytes32 dataFeedId, uint256 value) internal virtual;
}
