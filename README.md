# Juice Protocol
Lending protocol that enables isolated borrowing USDC against tokens locked in vesting contracts. Therefore, unlocking the ability to use future earnings as collateral - a form of undercollateralized lending. A Net Present Value is applied to borrow capacity where future tokens are discounted using a formula. Liquidators may seize unvested tokens that stream to the liquidator over time at a steep discount.

Built using Compound Protocol as a starting point, Vesting contracts use a standard template many DAOs use, and oracles use Chainlink.

Deployed to Kovan, Arbitrum Rinkeby, Harmony testnet, Aurora testnet.

ETHDenver Bounty Winners:
#### Harmony: Unique Usage for NFTs - 1st Prize
#### Metis - 2nd Place
#### Chainlink - Runner Up
#### Arbitrum: Best DeFi App - 1st Prize
#### Magic: A Magical User Experience - Winner

# Contract Addresses

## Kovan
- jUSDC: 0x063f8C3a224abEd8e821B57e7152BCa0e633D432
- USDC: 0xCec9b9aA30b51D2cdaE6586b7016FceC901aDC25
- LINK: 0x5f105f831dcD69C7af3fA7919dA2e89cd291239C
- ChainlinkPriceOracle: 0xc6CC421A38c724448219eDb68e9E59Ac389dC7D6
- VestingDemoCreator: 0x840A47872E07f83B8cb2bAB63e66BB984dfbFe37
- LendingController: 0xE85177c2E8c9C397fB971A13046317803C063cD7
- InterestRateModel: 0x13584Ac0Befd9E37DCcA8B4D9aE143C2500A8e0e

## Arbitrum Rinkeby
- jUSDC: 0xb91A8f3710879EfC365D16734a9D7e78DdB86128
- USDC: 0x08202D3B5E0dc6fa060E33Ed25F2C84582bc64E3
- LINK: 0x3FE2319074E3A1103A26d8321d827aabbf1015C4
- ChainlinkPriceOracle: 0x57D8387279c8B030Ff3eB3E588626C901Af4893D
- LendingController: 0x3b2A3077ecF80AAfA126dB18f641a148ad3848e8
- InterestRateModel: 0x068eC2df4FBDA4A6428c3F029F659e521EA9c8B8

## Harmony Testnet
- jUSDC: 0x125c0d97938c3e2EF7d236BaFCE8d4c927374137
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0x6715713831724679e0fEd5B63Fa4CDe8f73D2d76
- ChainlinkPriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83

## Aurora NEAR Testnet
- jUSDC: 0x125c0d97938c3e2EF7d236BaFCE8d4c927374137
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0x6715713831724679e0fEd5B63Fa4CDe8f73D2d76
- PriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83

## METIS Testnet
- jUSDC: 0x05b2880220D0f8C4d255856259A439A5F5D5fad6
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0xD9C60E01F98232a9f48d2fD0bEe8271b90bA738d
- PriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83