# On Chain Deployment and Evaluation

Scripts are available for the following actions: 

- Contract Deployment
- Contract Source Code Verification
- Contract Payout Evaluation

```
# in this dir
npx hardhat run scripts/deploy-all.js # deploy all contractrs or replace with specific deployment script
npx hardhat run scripts/verify-deployments.js # verify source codes for all deployed contracts
npx hardhat run scripts/evaluate-deployments.js # evaluate all deployed contracts with expired coverage periods
```

Contract deployment details are logged to `web_app/packages/contracts/src/logs`. 
