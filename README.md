# Juice Protocol
Lending protocol that enables isolated borrowing USDC against tokens locked in vesting contracts. Therefore, unlocking the ability to use future earnings as collateral - a form of undercollateralized lending. A Net Present Value is applied to borrow capacity where future tokens are discounted using a formula. Liquidators may seize unvested tokens that stream to the liquidator over time at a steep discount.

Built using Compound Protocol as a starting point, Vesting contracts use a standard template many DAOs use, and oracles use Chainlink.

Deployed to Kovan, Arbitrum Rinkeby, Harmony testnet, Aurora testnet.

# Contract Addresses

## Kovan
- jUSDC: 0x2e51b18eB85690Cd866e03d88Cd2BCB86aC09c34
- USDC: 0x7260F9380e0a9F986ac70C475415CDD112DeA0cd
- LINK: 0xC6ee9811B23d9ED3F8660Cf1aD7da4569D466e09
- ChainlinkPriceOracle: 0xd07C52356eB4537EB3C33787505c4e40BF568ca1
- LendingController: 0x6F9aa88ba3673455087BB125bfDb7Fe7aacA283D
- InterestRateModel: 0xDe649b9f1C8C2827c1b0D18C88765ED49b4D3260
- StandardVestingContract - Borrower 1: 0x02746550f99A98c6f424C4977766AEC16DA0E00E
- StandardVestingContract - Borrower 2: 0xB79203B78105a592C9E138E70c6D788e61EBd91A

## Arbitrum Rinkeby
- jUSDC: 0xb91A8f3710879EfC365D16734a9D7e78DdB86128
- USDC: 0x08202D3B5E0dc6fa060E33Ed25F2C84582bc64E3
- LINK: 0x3FE2319074E3A1103A26d8321d827aabbf1015C4
- ChainlinkPriceOracle: 0x57D8387279c8B030Ff3eB3E588626C901Af4893D
- LendingController: 0x3b2A3077ecF80AAfA126dB18f641a148ad3848e8
- InterestRateModel: 0x068eC2df4FBDA4A6428c3F029F659e521EA9c8B8
- StandardVestingContract - Borrower 1: 0x5927774D41493f5b60A99e90E9277926f8dD6b8B
- StandardVestingContract - Borrower 2: 0x513a4b6B29B325175590af580C0d1099b986f854

## Harmony Testnet
- jUSDC: 0x125c0d97938c3e2EF7d236BaFCE8d4c927374137
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0x6715713831724679e0fEd5B63Fa4CDe8f73D2d76
- ChainlinkPriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83
- StandardVestingContract - Borrower 1: 0xbB88e09385097878171346a59E709e24b53c4f71
- StandardVestingContract - Borrower 2: 0x6C0933DB8C384CAc65dabfD0698368B017A4A1e9

## Aurora NEAR Testnet
- jUSDC: 0x125c0d97938c3e2EF7d236BaFCE8d4c927374137
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0x6715713831724679e0fEd5B63Fa4CDe8f73D2d76
- PriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83
- StandardVestingContract - Borrower 1: 0xbB88e09385097878171346a59E709e24b53c4f71
- StandardVestingContract - Borrower 2: 0x6C0933DB8C384CAc65dabfD0698368B017A4A1e9

## METIS Testnet
- jUSDC: 0x05b2880220D0f8C4d255856259A439A5F5D5fad6
- USDC: 0x8050676c6ca7ecC8Fef4e383DF7bF804BeF915D6
- LINK: 0xD9C60E01F98232a9f48d2fD0bEe8271b90bA738d
- PriceOracle: 0x400aF5d37438c0beB9Ae69b05919599b1E2fb556
- LendingController: 0x19D46C4D663344646A29001aC39714c27Fbf0A17
- InterestRateModel: 0xeBAe4bB9bD4774E143543Ad3c8A2c5e847308b83
- StandardVestingContract - Borrower 1: 0xd516EA3cb011d5aCCDAa40F81bb41f975b7a0730
- StandardVestingContract - Borrower 2: 0xbca55732A62b761Bf4BEa86c1024F7bDED9A3030