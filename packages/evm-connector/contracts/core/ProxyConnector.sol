// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./RedstoneConstants.sol";
import "./CalldataExtractor.sol";

contract ProxyConnector is RedstoneConstants, CalldataExtractor {
  function proxyCalldata(
    address contractAddress,
    bytes memory encodedFunction,
    bool forwardValue
  ) internal returns (bytes memory) {
    bool success;
    bytes memory result;
    bytes memory message = _prepareMessage(encodedFunction);

    if (forwardValue == true) {
      (success, result) = contractAddress.call{value: msg.value}(message);
    } else {
      (success, result) = contractAddress.call(message);
    }
    return _prepareReturnValue(success, result);
  }

  function proxyDelegateCalldata(address contractAddress, bytes memory encodedFunction)
    internal
    returns (bytes memory)
  {
    bytes memory message = _prepareMessage(encodedFunction);
    (bool success, bytes memory result) = contractAddress.delegatecall(message);
    return _prepareReturnValue(success, result);
  }

  function proxyCalldataView(address contractAddress, bytes memory encodedFunction)
    internal
    view
    returns (bytes memory)
  {
    bytes memory message = _prepareMessage(encodedFunction);
    (bool success, bytes memory result) = contractAddress.staticcall(message);
    return _prepareReturnValue(success, result);
  }

  function _prepareMessage(bytes memory encodedFunction)
    private
    pure
    returns (bytes memory)
  {
    uint256 encodedFunctionBytesCount = encodedFunction.length;
    uint256 redstonePayloadByteSize = _getRedstonePayloadByteSize();
    uint256 resultMessageByteSize = encodedFunctionBytesCount + redstonePayloadByteSize;

    uint256 i;
    bytes memory message;

    assembly {
      message := mload(FREE_MEMORY_PTR) // sets message pointer to first free place in memory

      // Saving the byte size of the result message (it's a standard in EVM)
      mstore(message, resultMessageByteSize)

      // Copying function and its arguments byte by byte
      // TODO: check if it can be implemented in a more efficient way (e.g. with less iterations in the loop)
      for {
        i := 0
      } lt(i, encodedFunctionBytesCount) {
        i := add(i, 1)
      } {
        mstore(
          add(add(BYTES_ARR_LEN_VAR_BS, message), mul(STANDARD_SLOT_BS, i)), // address
          mload(add(add(BYTES_ARR_LEN_VAR_BS, encodedFunction), mul(STANDARD_SLOT_BS, i))) // byte to copy
        )
      }

      // Copying redstone payload to the message bytes
      calldatacopy(
        add(message, add(BYTES_ARR_LEN_VAR_BS, encodedFunctionBytesCount)), // address
        sub(calldatasize(), redstonePayloadByteSize), // offset
        redstonePayloadByteSize // bytes length to copy
      )

      // Updating free memory pointer
      mstore(
        FREE_MEMORY_PTR,
        add(
          add(message, add(redstonePayloadByteSize, encodedFunctionBytesCount)),
          BYTES_ARR_LEN_VAR_BS
        )
      )
    }

    return message;
  }

  function _getRedstonePayloadByteSize() private pure returns (uint256) {
    uint256 calldataNegativeOffset = _extractByteSizeOfUnsignedMetadata();
    uint256 dataPackagesCount = _extractDataPackagesCountFromCalldata(
      calldataNegativeOffset
    );
    calldataNegativeOffset += DATA_PACKAGES_COUNT_BS;
    for (
      uint256 dataPackageIndex = 0;
      dataPackageIndex < dataPackagesCount;
      dataPackageIndex++
    ) {
      uint256 dataPackageByteSize = _getDataPackageByteSize(calldataNegativeOffset);
      calldataNegativeOffset += dataPackageByteSize;
    }

    return calldataNegativeOffset;
  }

  function _getDataPackageByteSize(uint256 calldataNegativeOffset)
    private
    pure
    returns (uint256)
  {
    (
      uint256 dataPointsCount,
      uint256 eachDataPointValueByteSize
    ) = _extractDataPointsDetailsForDataPackage(calldataNegativeOffset);

    return
      dataPointsCount *
      (DATA_POINT_SYMBOL_BS + eachDataPointValueByteSize) +
      DATA_PACKAGE_WITHOUT_DATA_POINTS_BS;
  }

  // TODO: test error message forwarding (compare V1 and V2)
  function _prepareReturnValue(bool success, bytes memory result)
    internal
    pure
    returns (bytes memory)
  {
    if (!success) {
      // V1
      if (result.length > 0) {
        assembly {
          let result_size := mload(result)
          revert(add(32, result), result_size)
        }
      } else {
        revert("Proxy calldata failed");
      }

      // V2
      // assembly {
      //   let errMsgPtr := mload(FREE_MEMORY_PTR)
      //   returndatacopy(errMsgPtr, 0, returndatasize())
      //   revert(errMsgPtr, returndatasize())
      // }
    }

    return result;
  }
}
