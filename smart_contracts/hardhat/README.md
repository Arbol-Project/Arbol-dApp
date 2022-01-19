# On Chain Deployment and Evaluation

Scripts are available for the following actions: 

- Contract Testing
- Contract Deployment
- Contract Source Code Verification
- Contract Payout Evaluation

```
# in this dir
npx hardhat test                                # run tests on Blizzard contract (Contract should be set for Kovan network)
npx hardhat run scripts/deploy-blizzard.js      # deploy contracts
npx hardhat run scripts/verify-deployments.js   # verify source codes for all deployed contracts
npx hardhat run scripts/evaluate-deployments.js # evaluate all deployed contracts with expired coverage periods
```

Contract deployment details are logged to `web_app/packages/contracts/src/logs`. 

Included in the `test` and `contracts` directories, respectively, are a flattened Blizzard contract for fuzzing and a modified Chainlink Operator contract that whitelists oracle request senders.
