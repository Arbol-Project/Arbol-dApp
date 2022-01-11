// checkAccess : depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation, getContractParameters
// private : newContract, stringToBytes32
// args : addContractJob, removeContractJob
// ordering: depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation
// balances : depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation

// 0 payout job : "235c23a24e7c4d729f89bbccdeb83fa5"
// 250000000 payout job : "c649e935faec47c9be868580a1df4889"

// tests are meant to be run on Kovan


const delay = ms => new Promise(res => setTimeout(res, ms));
const path = require("path");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const ERC20ABI = require(path.join(process.cwd(), "../../web_app/packages/contracts/src/abis/erc20.json"));


describe("BlizzardDerivativeFactory Tests", function () {

  let BlizzardDerivativeProvider;
  let ProviderContract;
  let LinkToken;
  let StableCoin;
  let admin;
  let purchaser;
  let provider;
  var params = ["station_id", "USW00003927", "weather_variable", "SNOW", "dataset", "ghcnd", "opt_type", "CALL", "strike", "0", "limit", "250000", "tick", "250000", "threshold", "6", "imperial_units", "True", "dates", '["2021-10-06", "2021-10-08", "2021-10-26", "2021-10-28", "2021-10-31", "2021-11-02", "2021-11-06", "2021-11-08", "2021-11-15", "2021-11-27", "2021-11-29", "2021-12-03", "2021-12-04", "2021-12-07", "2021-12-13", "2021-12-15", "2021-12-21", "2021-12-23"]'];

  before(async function () {
    // get interfaces for LINK token and stable coin to approve transfers
    [ admin ] = await ethers.getSigners();
    LinkToken = new ethers.Contract("0xa36085F69e2889c224210F603D836748e7dC0088", ERC20ABI, admin);
    StableCoin = new ethers.Contract("0xe8AA8A60C9417d8fD59EB4378687dDCEEd29c1B4", ERC20ABI, admin);
  });

  beforeEach(async function () {
    // deploy new provider contract, approve LINK and stablecoin transfers
    BlizzardDerivativeProvider = await ethers.getContractFactory("BlizzardDerivativeProvider");
    ProviderContract = await BlizzardDerivativeProvider.deploy();
    await ProviderContract.deployed();

    provider = await ProviderContract.COLLATERAL_ADDRESS();
    purchaser = await ProviderContract.PREMIUM_ADDRESS();
    collateral = await ProviderContract.COLLATERAL_PAYMENT();
    premium = await ProviderContract.PREMIUM_PAYMENT();

    var tx = await StableCoin.approve(ProviderContract.address, collateral.add(premium));
    await tx.wait();

    tx = await LinkToken.approve(ProviderContract.address, 1000);
    await tx.wait();
  });

  describe("Unit", function () {

    describe("Deployment State", function () {

      it("Should have correct parameters", async function () {

        tx = await ProviderContract.addAccess(admin.address);
        await tx.wait();

        var access = await ProviderContract.hasAccess(admin.address, 64);
        expect(access).to.equal(true);

        tx = await ProviderContract.depositCollateral();
        await tx.wait();

        tx = await ProviderContract.depositPremium();
        await tx.wait();

        var parameters = await ProviderContract.getContractParameters();
        for (var i = 0; i < parameters.length; i++) {
          expect(parameters[i]).to.equal(params[i]);
        }
      });

      it("Should have access enabled and need to grant access to appropriate parties", async function () {

        var accessCheckEnabled = await ProviderContract.checkEnabled();
        expect(accessCheckEnabled).to.equal(true);

        var adminAccess = await ProviderContract.hasAccess(admin.address, 64);
        expect(adminAccess).to.equal(false);

        var purchaserAccess = await ProviderContract.hasAccess(purchaser, 64);
        expect(purchaserAccess).to.equal(false);

        var providerAccess = await ProviderContract.hasAccess(provider, 64);
        expect(providerAccess).to.equal(false);

        tx = await ProviderContract.addAccess(admin.address);
        await tx.wait();
          
        tx = await ProviderContract.addAccess(provider);
        await tx.wait();

        tx = await ProviderContract.addAccess(purchaser);
        await tx.wait();

        adminAccess = await ProviderContract.hasAccess(admin.address, 64);
        expect(adminAccess).to.equal(true);

        purchaserAccess = await ProviderContract.hasAccess(purchaser, 64);
        expect(purchaserAccess).to.equal(true);

        providerAccess = await ProviderContract.hasAccess(provider, 64);
        expect(providerAccess).to.equal(true);
      });
    });

    describe("Call Ordering", function () {

      it("Should only allow depositCollateral => depositPremium => initiateContractEvaluation => fulfillContractEvaluation and only once", async function () {
        
        expect(_ => errCall(ProviderContract.depositCollateral())).to.throw();
        expect(_ => errCall(ProviderContract.depositPremium())).to.throw();
        expect(_ => errCall(ProviderContract.initiateContractEvaluation())).to.throw();
        expect(_ => errCall(ProviderContract.fulfillContractEvaluation())).to.throw();

        tx = await ProviderContract.addAccess(admin.address);
        await tx.wait();

        // console.log("access");

        expect(_ => errCall(ProviderContract.depositPremium())).to.throw();
        expect(_ => errCall(ProviderContract.initiateContractEvaluation())).to.throw();
        expect(_ => errCall(ProviderContract.fulfillContractEvaluation())).to.throw();

        var collateralDeposited = await ProviderContract.collateralDeposited();
        expect(collateralDeposited).to.equal(false);
        tx = await ProviderContract.depositCollateral();
        await tx.wait();
        collateralDeposited = await ProviderContract.collateralDeposited();
        expect(collateralDeposited).to.equal(true);

        // console.log("collateral");

        expect(_ => errCall(ProviderContract.depositCollateral())).to.throw();
        expect(_ => errCall(ProviderContract.initiateContractEvaluation())).to.throw();
        expect(_ => errCall(ProviderContract.fulfillContractEvaluation())).to.throw();

        var premiumDeposited = await ProviderContract.premiumDeposited();
        expect(premiumDeposited).to.equal(false);
        tx = await ProviderContract.depositPremium();
        await tx.wait();
        premiumDeposited = await ProviderContract.premiumDeposited();
        expect(premiumDeposited).to.equal(true);

        // console.log("premium");

        expect(_ => errCall(ProviderContract.depositCollateral())).to.throw();
        expect(_ => errCall(ProviderContract.depositPremium())).to.throw();
        expect(_ => errCall(ProviderContract.fulfillContractEvaluation())).to.throw();

        var contractEvaluated = await ProviderContract.getContractEvaluated();
        expect(contractEvaluated).to.equal(false);
        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        await delay(45*1000); // wait for oracle request to be fulfilled
        contractEvaluated = await ProviderContract.getContractEvaluated();
        expect(contractEvaluated).to.equal(true);

        // console.log("evaluation");

        expect(_ => errCall(ProviderContract.depositCollateral())).to.throw();
        expect(_ => errCall(ProviderContract.depositPremium())).to.throw();
        expect(_ => errCall(ProviderContract.initiateContractEvaluation())).to.throw();

        var contractPaidOut = await ProviderContract.contractPaidOut();
        expect(contractPaidOut).to.equal(false);
        tx = await ProviderContract.fulfillContractEvaluation();
        await tx.wait();
        contractPaidOut = await ProviderContract.contractPaidOut();
        expect(contractPaidOut).to.equal(true);
        
        // console.log("payout");
        
        expect(_ => errCall(ProviderContract.depositCollateral())).to.throw();
        expect(_ => errCall(ProviderContract.depositPremium())).to.throw();
        expect(_ => errCall(ProviderContract.initiateContractEvaluation())).to.throw();
        expect(_ => errCall(ProviderContract.fulfillContractEvaluation())).to.throw();
      });
    });
  });
  
  describe("Integration", function () {

    describe("Initial Balances", async function () {

      it("Should have appropriate LINK and stable coin allowances and 0 initial balance", async function () {
        var providerBalance = await StableCoin.balanceOf(ProviderContract.address);
        expect(providerBalance.toString()).to.equal(new ethers.BigNumber.from(0).toString());

        var StableAllowance = await StableCoin.allowance(admin.address, ProviderContract.address);
        expect(StableAllowance.toString()).to.equal(collateral.add(premium).toString());

        var LinkAllowance = await LinkToken.allowance(admin.address, ProviderContract.address);
        expect(LinkAllowance.toString()).to.equal(new ethers.BigNumber.from(1000).toString());
      });
    });

    describe("Payout Scenario", function () {

      it('Should transfer collateral to purchaser and premium to provider', async () => {

        tx = await ProviderContract.addAccess(admin.address);
        await tx.wait();

        // console.log("access");

        var prevProviderBalance = await StableCoin.balanceOf(provider);
        var prevPurchaserBalance = await StableCoin.balanceOf(purchaser);
        
        var tx = await ProviderContract.depositCollateral();
        await tx.wait();
        tx = await ProviderContract.depositPremium();
        await tx.wait();

        // console.log("contract");

        tx = await ProviderContract.addContractJob("0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd", "c649e935faec47c9be868580a1df4889");
        await tx.wait();
        tx = await ProviderContract.removeContractJob("63bb451d36754aab849577a73ce4eb7e");
        await tx.wait();

        // console.log("job");

        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        await delay(45*1000); // wait for oracle request to be fulfilled

        // console.log("evaluation");

        var payout = await ProviderContract.getContractPayout();
        expect(payout.toString()).to.equal(collateral.toString());

        tx = await ProviderContract.fulfillContractEvaluation();
        await tx.wait();

        // console.log("payout");

        var providerBalance = await StableCoin.balanceOf(provider);
        expect(providerBalance.toString()).to.equal(prevProviderBalance.add(premium).toString());

        var purchaserBalance = await StableCoin.balanceOf(purchaser);
        expect(purchaserBalance.toString()).to.equal(collateral.add(prevPurchaserBalance).toString());

        var contractBalance = await StableCoin.balanceOf(ProviderContract.address);
        expect(contractBalance.toString()).to.equal(new ethers.BigNumber.from(0).toString());
      });
    });

    describe("Non Payout Scenario", function () {

      it('Should transfer all funds to provider', async () => {

        tx = await ProviderContract.addAccess(admin.address);
        await tx.wait();

        // console.log("access");

        var prevProviderBalance = await StableCoin.balanceOf(provider);
        var prevPurchaserBalance = await StableCoin.balanceOf(purchaser);
        
        var tx = await ProviderContract.depositCollateral();
        await tx.wait();
        tx = await ProviderContract.depositPremium();
        await tx.wait();

        // console.log("contract");

        tx = await ProviderContract.removeContractJob("63bb451d36754aab849577a73ce4eb7e");
        await tx.wait();
        tx = await ProviderContract.addContractJob("0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd", "235c23a24e7c4d729f89bbccdeb83fa5");
        await tx.wait();

        // console.log("job");

        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        await delay(45*1000); // wait for oracle request to be fulfilled

        // console.log("evaluation");

        var payout = await ProviderContract.getContractPayout();
        expect(payout.toString()).to.equal(new ethers.BigNumber.from(0).toString());

        tx = await ProviderContract.fulfillContractEvaluation();
        await tx.wait();

        // console.log("payout");

        var providerBalance = await StableCoin.balanceOf(provider);
        expect(providerBalance.toString()).to.equal(collateral.add(premium.add(prevProviderBalance).toString()));

        var purchaserBalance = await StableCoin.balanceOf(purchaser);
        expect(purchaserBalance.toString()).to.equal(prevPurchaserBalance.toString());

        var contractBalance = await StableCoin.balanceOf(ProviderContract.address);
        expect(contractBalance.toString()).to.equal(new ethers.BigNumber.from(0).toString());
      });
    });
  });
});