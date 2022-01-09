// checkAccess : depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation, getContractParameters
// private : newContract, stringToBytes32
// args : addContractJob, removeContractJob
// ordering: depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation
// balances : depositCollateral, depositPremium, initiateContractEvaluation, fulfillContractEvaluation

// 0 payout job : "235c23a24e7c4d729f89bbccdeb83fa5"
// 250000000 payout job : "c649e935faec47c9be868580a1df4889"

const { abis } = require(path.join(process.cwd(), "../../web_app/packages/contracts/src/abis.js"));
const { addresses } = require(path.join(process.cwd(), "../../web_app/packages/contracts/src/addresses.js"));

const { expect } = require("chai");
const { ethers } = require("hardhat");

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
    LinkToken = await ethers.getContractAt(addresses.LINK, abis.erc20, admin);
    StableCoin = await ethers.getContractAt(addresses.USDC, abis.erc20, admin);
  });

  beforeEach(async function () {
    // deploy new provider contract, approve LINK and stablecoin transfers
    BlizzardDerivativeProvider = await ethers.getContractFactory("BlizzardDerivativeProvider");
    ProviderContract = await BlizzardDerivativeProvider.deploy();
    await ProviderContract.deployed();

    collateral = await BlizzardDerivativeProvider.COLLATERAL_PAYMENT();
    premium = await BlizzardDerivativeProvider.PREMIUM_PAYMENT();
    var tx = await StableCoin.approve(BlizzardDerivativeProvider.address, collateral + premium);
    await tx.wait();

    tx = await LinkToken.approve(BlizzardDerivativeProvider.address, 1000);
    await tx.wait();

    provider = BlizzardDerivativeProvider.COLLATERAL_ADDRESS();
    purchaser = BlizzardDerivativeProvider.PREMIUM_ADDRESS();
  });

  describe("Unit", function () {
  
    describe("Deployment State", function () {

      it("Should have correct parameters", async function () {
        expect(ProviderContract.getContractParameters()).to.equal(params);
      });

      it("Should have access enabled and grant access to appropriate parties", async function () {

        expect(ProviderContract.checkEnabled()).to.equal(true);
        expect(ProviderContract.hasAccess(admin)).to.equal(false);
        expect(ProviderContract.hasAccess(purchaser)).to.equal(false);
        expect(ProviderContract.hasAccess(provider)).to.equal(false);

        tx = await ProviderContract.addAccess(admin);
        await tx.wait();
          
        tx = await ProviderContract.addAccess(provider);
        await tx.wait();

        tx = await ProviderContract.addAccess(purchaser);
        await tx.wait();

        expect(ProviderContract.hasAccess(admin)).to.equal(true);
        expect(ProviderContract.hasAccess(purchaser)).to.equal(true);
        expect(ProviderContract.hasAccess(provider)).to.equal(true);
      });
    });

    describe("Call Ordering", function () {

      it("Should only allow (once) depositCollateral => depositPremium => initiateContractEvaluation => fulfillContractEvaluation", async function () {

        tx = await ProviderContract.addAccess(admin);
        await tx.wait();
        
        expect(ProviderContract.depositPremium()).to.be.reverted;
        expect(ProviderContract.initiateContractEvaluation()).to.be.reverted;
        expect(ProviderContract.fulfillcontractEvaluation()).to.be.reverted;

        expect(ProviderContract.collateralDeposited()).to.equal(false);
        var tx = await ProviderContract.depositCollateral();
        await tx.wait();
        expect(ProviderContract.collateralDeposited()).to.equal(true);

        expect(ProviderContract.depositCollateral()).to.be.reverted;
        expect(ProviderContract.initiateContractEvaluation()).to.be.reverted;
        expect(ProviderContract.fulfillcontractEvaluation()).to.be.reverted;

        expect(ProviderContract.premiumDeposited()).to.equal(false);
        tx = await ProviderContract.depositPremium();
        await tx.wait();
        expect(ProviderContract.premiumDeposited()).to.equal(true);

        expect(ProviderContract.depositCollateral()).to.be.reverted;
        expect(ProviderContract.depositPremium()).to.be.reverted;
        expect(ProviderContract.fulfillcontractEvaluation()).to.be.reverted;

        expect(ProviderContract.getContractEvaluated()).to.equal(false);
        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        expect(ProviderContract.getContractEvaluated()).to.equal(true);

        expect(ProviderContract.depositCollateral()).to.be.reverted;
        expect(ProviderContract.depositPremium()).to.be.reverted;
        expect(ProviderContract.initiateContractEvaluation()).to.be.reverted;

        expect(ProviderContract.contractPaidOut()).to.equal(false);
        tx = await ProviderContract.fulfillcontractEvaluation();
        await tx.wait();
        expect(ProviderContract.contractPaidOut()).to.equal(true);

        expect(ProviderContract.depositCollateral()).to.be.reverted;
        expect(ProviderContract.depositPremium()).to.be.reverted;
        expect(ProviderContract.initiateContractEvaluation()).to.be.reverted;
        expect(ProviderContract.fulfillcontractEvaluation()).to.be.reverted;
      });
    });
  });
  
  describe("Integration", function () {

    it("Should have appropriate LINK and stable coin allowances and 0 initial balance", async function () {
      expect(StableCoin.balanceOf(ProviderContract.address)).to.equal(0);
      expect(StableCoin.allowance(ProviderContract.address)).to.equal(collateral + premium);
      expect(LinkToken.allowance(ProviderContract.address)).to.equal(1000);
    });

    describe("Payout Scenario", function () {

      it('Should transfer collateral to purchaser and premium to provider', async () => {

        tx = await ProviderContract.addAccess(admin);
        await tx.wait();

        var prevProviderBalance = await StableCoin.balanceOf(provider);
        var prevPurchaserBalance = await StableCoin.balanceOf(purchaser);
        
        var tx = await ProviderContract.depositCollateral();
        await tx.wait();
        tx = await ProviderContract.depositPremium();
        await tx.wait();

        tx = await ProviderContract.addContractJob("0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd", "c649e935faec47c9be868580a1df4889");
        await tx.wait();
        tx = await ProviderContract.removeContractJob("63bb451d36754aab849577a73ce4eb7e");
        await tx.wait();

        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        tx = await ProviderContract.fulfillcontractEvaluation();
        await tx.wait();

        expect(ProviderContract.getContractPayout()).to.equal(collateral);
        expect(StableCoin.balanceOf(provider)).to.equal(prevProviderBalance + premium);
        expect(StableCoin.balanceOf(purchaser)).to.equal(prevPurchaserBalance + collateral);
        expect(StableCoin.balanceOf(ProviderContract.address)).to.equal(0);
      });
    });

    describe("Non Payout Scenario", function () {

      it('Should transfer all funds to provider', async () => {

        tx = await ProviderContract.addAccess(admin);
        await tx.wait();

        var prevProviderBalance = await StableCoin.balanceOf(provider);
        var prevPurchaserBalance = await StableCoin.balanceOf(purchaser);
        
        var tx = await ProviderContract.depositCollateral();
        await tx.wait();
        tx = await ProviderContract.depositPremium();
        await tx.wait();

        tx = await ProviderContract.removeContractJob("63bb451d36754aab849577a73ce4eb7e");
        await tx.wait();
        tx = await ProviderContract.addContractJob("0x58935F97aB874Bc4181Bc1A3A85FDE2CA80885cd", "235c23a24e7c4d729f89bbccdeb83fa5");
        await tx.wait();

        tx = await ProviderContract.initiateContractEvaluation();
        await tx.wait();
        tx = await ProviderContract.fulfillcontractEvaluation();
        await tx.wait();

        expect(ProviderContract.getContractPayout()).to.equal(0);
        expect(StableCoin.balanceOf(provider)).to.equal(prevProviderBalance + collateral + premium);
        expect(StableCoin.balanceOf(purchaser)).to.equal(prevPurchaserBalance);
        expect(StableCoin.balanceOf(ProviderContract.address)).to.equal(0);
      });
    });
  });
});