// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import "./PriceOracle.sol";
import "./CErc20.sol";
import "./interfaces/IChainlinkAggregatorV3.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/SafeCast.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract ChainlinkPriceOracle is PriceOracle {
    using SafeCast for int256;
    using SafeMath for uint256;

    mapping(address => uint) prices;
    // Collateral oracle
    event PricePosted(address asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);

    function _getUnderlyingAddress(CToken cToken) private view returns (address) {
        address asset;
        if (compareStrings(cToken.symbol(), "cETH")) {
            asset = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        } else {
            asset = address(CErc20(address(cToken)).underlying());
        }
        return asset;
    }

    function getUnderlyingPrice(CToken cToken) public view override returns (uint) {
        return prices[_getUnderlyingAddress(cToken)];
    }

    function getPrice(address asset) public view override returns (uint) {
        asset; // Unused as we assume LINK price for asset
        // Calculate prices from chainlink. Assume LINK price on Kovan
        int256 rawCollateralPrice = IChainlinkAggregatorV3(0x396c5E36DD0a0F5a5D33dae44368D4193f69a1F0).latestAnswer();
        
        // Set to 10 ** 18
        return rawCollateralPrice.toUint256().mul(10 ** 10);
    }

    function setUnderlyingPrice(CToken cToken, uint underlyingPriceMantissa) public {
        address asset = _getUnderlyingAddress(cToken);
        emit PricePosted(asset, prices[asset], underlyingPriceMantissa, underlyingPriceMantissa);
        prices[asset] = underlyingPriceMantissa;
    }

    // Does nothing
    function setDirectPrice(address asset, uint price) public {}

    // v1 price oracle interface for use as backing of proxy
    function assetPrices(address asset) external view returns (uint) {
        return prices[asset];
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
