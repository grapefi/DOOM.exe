// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.30;

/// @notice Immutable bytes stored as STOP || payload. Calls stop immediately.
contract DataChunk {
    error InvalidSize();
    constructor(bytes memory payload) {
        if (payload.length == 0 || payload.length > 24_575) revert InvalidSize();
        bytes memory runtime = bytes.concat(hex"00", payload);
        assembly { return(add(runtime, 32), mload(runtime)) }
    }
}
