
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

//  Treasury: star wrapper
//
//    This contract implements an extremely simple wrapper for stars.
//    It allows owners of Azimuth star points to deposit them and mint new WSTR (wrapped star) tokens,
//    and in turn to redeem WSTR tokens for Azimuth stars.

interface ITreasury {
    // MODEL

    //  getAllAssets(): return array of assets held by this contract
    //
    //    Note: only useful for clients, as Solidity does not currently
    //    support returning dynamic arrays.
    //
    function getAllAssets()
        view
        external
        returns (uint16[] memory allAssets);

    //  getAssetCount(): returns the number of assets held by this contract
    //
    function getAssetCount()
        view
        external
        returns (uint256 count);

    //  deposit(star): deposit a star you own, receive a newly-minted wrapped star token in exchange
    //
    function deposit(uint16 _star) external;

    //  redeem(): burn one star token, receive ownership of the most recently deposited star in exchange
    //
    function redeem() external returns (uint16);
}
