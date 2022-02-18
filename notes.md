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

