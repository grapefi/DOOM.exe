// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.30;

/// @notice Ordered, immutable ROM manifest. No owner, upgrades or write functions.
/// Hashes commit to compressed bytes and the exact decompressed binary envelope.
contract RomManifest {
    uint256 public constant VERSION = 1;
    uint256 public constant MAX_CHUNKS = 1024;
    uint256 public constant CHUNK_BYTES = 24_575;
    bytes32 public immutable compressedHash;
    bytes32 public immutable rawHash;
    uint256 public immutable compressedSize;
    uint256 public immutable rawSize;
    address[] public chunks;
    error InvalidManifest();

    constructor(address[] memory addresses, bytes32 compressedHash_, bytes32 rawHash_, uint256 compressedSize_, uint256 rawSize_) {
        uint256 n = addresses.length;
        if (n == 0 || n > MAX_CHUNKS || compressedSize_ == 0 || rawSize_ < 16 || rawSize_ > 67_108_864 || compressedHash_ == 0 || rawHash_ == 0) revert InvalidManifest();
        uint256 size;
        for (uint256 i; i < n; ++i) {
            address chunk = addresses[i];
            uint256 length;
            uint256 prefix;
            // Inspect one byte only; copying every payload would expand memory
            // quadratically for large cartridges and make the manifest too costly.
            assembly ("memory-safe") {
                length := extcodesize(chunk)
                extcodecopy(chunk, 0, 0, 1)
                prefix := byte(0, mload(0))
            }
            if (length < 2 || length > CHUNK_BYTES + 1 || prefix != 0) revert InvalidManifest();
            if (i + 1 < n && length != CHUNK_BYTES + 1) revert InvalidManifest();
            size += length - 1;
        }
        if (size != compressedSize_) revert InvalidManifest();
        chunks = addresses;
        compressedHash = compressedHash_;
        rawHash = rawHash_;
        compressedSize = compressedSize_;
        rawSize = rawSize_;
    }
    function chunkCount() external view returns (uint256) { return chunks.length; }
}
