// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./BlizzardDerivativeProvider";


contract FuzzProvider is BlizzardDerivativeProvider {
    function echidna_state_balances() public view returns(bool) {
        LinkTokenInterface stablecoin = LinkTokenInterface(STABLECOIN_ADDRESS);
        if (!collateralDeposited) {
            return !premiumDeposited && !contractEvaluated && !contractPaidOut && stablecoin.balanceOf(address(this)) <= COLLATERAL_PAYMENT;
        }
        if (!premiumDeposited) {
            return !contractEvaluated && !contractPaidOut && stablecoin.balanceOf(address(this)) >= COLLATERAL_PAYMENT;
        }
        if (!contractEvaluated) {
            return !contractPaidOut && stablecoin.balanceOf(address(this)) >= COLLATERAL_PAYMENT + PREMIUM_PAYMENT;
        }
        if (!contractPaidOut) {
            return stablecoin.balanceOf(address(this)) >= COLLATERAL_PAYMENT + PREMIUM_PAYMENT;   
        } 
        return stablecoin.balanceOf(address(this)) == 0;
    }
}