
export default {
  // TOKENS
  USDC: {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    42: "0x15758350DECEA0E5A96cFe9024e3f352d039905a",
  },
  DAI: {
    1: "0x6b175474e89094c44da98b954eedeac495271d0f",
    42: "0xF091720Dea579d7Eec922d8B2A3A67ba522CCf6D",
  },



  // Oracles

  ETH_ORACLE_PROXY: {
    // This is production, not staging mainnet
    1: "0x97C3e595e8f80169266B5534e4d7A1bB58BB45ab",
    42: "0xE2cFc870edFb863beF5057ed19cb8F904C84100C",
  },
  DAI_ORACLE_PROXY: {
    // This is production, not staging mainnet
    1: "0xa0485EbFE8854855C68B6Fa058AEe1B62A66Ea9d",
    // This oracle is manipulatable, it is not reading from an actual data source
    42: "0x2890830E40CB2E1e82245b359491a8F8E7560a4b",
  },
  BTC_ORACLE_PROXY: {
    // This is production, not staging mainnet
    1: "0xbf63446ecF3341e04c6569b226a57860B188edBc",
    42: "0x46c2f93470d9367792806f199E5Fc8d1896F16E1",
  },
  USDC_ORACLE: {
    // This is set to $1
    1: "0x7561E6D8301cDac56787E203b06E98427a36B1e0",
    42: "0x7970AC597e74829DECe89AFCCE608eb716cAc8cC",
  },

  // WHALES (for forked mainnet testing)
  USDC_WHALE: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
  DAI_WHALE: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",

} as any;
