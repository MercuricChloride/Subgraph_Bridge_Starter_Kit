pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: GPLv3

import "./ISubgraphBridge.sol";

contract YourContract {
    ISubgraphBridge public subgraphBridge;

    constructor(address _subgraphBridge) {
        // what should we do on deploy?
        subgraphBridge = ISubgraphBridge(_subgraphBridge);
    }

    function doSomething() public {}
}
