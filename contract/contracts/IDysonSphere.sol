// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.6;
pragma abicoder v2;

interface IDysonSphere {
    struct Star {
        uint16 star;
        address targetOwner;
        uint depth;
    }

    struct PoolMember {
        uint256 wstrPooled;
        uint16[] stars;
    }

    // Add wstr to pool with stars to collect
    //
    // This will transfer all allowed wstr into the smart contract and keep it until the pool is kicked
    // This is an additive operation, if you want to remove unwanted stars, exit from pool completely, and re-enter.
    //
    // It is recommended to not pick stars that are too shallow, and to "insure" the position by pooling more wstr than needed,
    // because otherwise you could be kicked out with a penalty applied.
    function enterPool(uint256 wstrToPool, uint16[] calldata stars) external;

    // Buy stars individually
    //
    // This will buy stars from the stardust treasury without entering a pool. The more wstr is approved, the cheaper it is to buy the stars.
    //
    // The stars must be sorted by depth, and maxDepth must be sufficient for the swap. See kickPoolFast for more details.
    //
    // The contract allows setting arbitrary target owner for each star, so make sure it is set correctly!
    function buyIndividually(uint256 approvedWstr, Star[] calldata stars, uint maxDepth) external;

    // Exit from pool.
    //
    // This will return any pooled wstr back to the user without any penalty.
    function exitPool() external;

    // Kick user from pool
    //
    // This is an administrative operation that allows feeCollector to kick any member from the pool without penalties
    function kickFromPool(address member) external;

    // Kick from pool on penalty basis
    //
    // This allows to kick and penalize a member by anyone if one of these conditions are met:
    // 1. The stardust treasury no longer contains all of the stars requested by the member
    // 2. The member's pooled wstr alone is no longer enough to cover for the fees incurred. This may occur if more stars are deposited into the treasury
    function kickFromPoolOnPenaltyBasis(address member) external;

    // Compute a sorted list of stars and the maximum depth.
    //
    // This function is meant to be called off-chain and passed to kickPoolFast, because it takes about 3 million gas to dump the treasury.
    function pooledStars() external view returns (Star[] memory stars, uint maxDepth);

    // Get information about pool member.
    function poolMember(address addr) external view returns (PoolMember memory member);

    // Kick the pool with input sorted list of stars and estimated depth.
    //
    // This will perform a flash swap, collect the pooled stars, transfer them to respective owners, and return any remaining wstr to owners.
    //
    // This is a very expensive operation in the order of O(maxDepth). Thus it is recommended to call pooledStars() off-chain and pass the data here to not run out of gas.
    //
    // The stars list must be sorted, and maxDepth must be sufficient for the swap. It is recommended to supply depth + 2 as maxDepth, where depth is the computed depth, to protect against "frontrunning".
    //
    // TODO: verify maxDepth in the contract, so that the user is penalized for submitting a value too large
    function kickPoolFast(Star[] calldata stars, uint maxDepth) external;

  // Add ourselves to pool and kick it, in one operation
  // This is the same as calling enterPool, and then kickPoolFast(pooledStars()), but is useful for saving gas, and estimating gas!
  function enterPoolAndKick(uint256 wstrToPool, Star[] calldata stars, uint maxDepth) external;
}

