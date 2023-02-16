// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

interface IEcliptic {
    function transferPoint(uint32, address, bool) external;
    function spawn(uint32, address) external;
    function setTransferProxy(uint32 _point, address _transferProxy) external;
}
