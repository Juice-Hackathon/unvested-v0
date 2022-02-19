### Flows

--------------------------------------------------
## Lender
--------------------------------------------------

# Deposit funds

1. approve USDC transfer limit
2. Mint: ```function mint(uint mintAmount) external virtual returns (uint);```


# Withdraw

1.    ```function redeem(uint redeemTokens) external virtual returns (uint);```
  or  ```function redeemUnderlying(uint redeemAmount) external virtual returns (uint);```


# Check interest accrued

```function balanceOf(address owner) external virtual view returns (uint);```
```function balanceOfUnderlying(address owner) external virtual returns (uint);```


--------------------------------------------------
## Borrower
--------------------------------------------------

# Deposit contract

user entry function: ```deposit(vestingContract: address)```



# Check borrow capacity


# Borrow

# Pay back



# Withdraw collateral contract



--------------------------------------------------
## Liquidator
--------------------------------------------------

# Find eligible liquidations


# Liquidate



--------------------------------------------------
## Admin
--------------------------------------------------


1. Admin registers vesting contract address
2. User setRecipient as comptroller on the vesting contract
3. User calls register on comptroller to enter market
4. getNPV is called

1. setCollateralParams is called
2. Params stored in struct in Comptroller

1000000000000000000000
   4655171867072552004

