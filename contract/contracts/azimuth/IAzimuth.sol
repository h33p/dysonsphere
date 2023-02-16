// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

interface IAzimuth {
    function isOwner(uint32, address) external returns (bool);
    function isActive(uint32) external returns (bool);
    function isSpawnProxy(uint32, address) external returns (bool);
    function isTransferProxy(uint32, address) external returns (bool);
    function getPrefix(uint32) external returns (uint16);
    function getPointSize(uint32) external returns (Size);
    function owner() external returns (address);
    function getSpawnCount(uint32) view external returns (uint32);
    function getTransferProxy(uint32 _point) view external returns (address transferProxy);
    enum Size
    {
        Galaxy, // = 0
        Star,   // = 1
        Planet  // = 2
    }
}
