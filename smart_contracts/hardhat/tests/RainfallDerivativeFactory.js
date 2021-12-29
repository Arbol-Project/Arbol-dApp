const { expect } = require("chai");

describe("RainfallDerivativeProvider contract", function () {
  it("All function calls should return after deployment", async function () {
    const [owner] = await ethers.getSigners();

    const RainfallDerivativeProvider = await ethers.getContractFactory("RainfallDerivativeProvider");

    const derivative_provider = await RainfallDerivativeProvider.deploy();
    await derivative_provider.deployed();

    var tx = await derivative_provider.newContract(["a"], ["name", "a", "a", "a", "a", "a", "a", "a"], 0);
    await tx.wait();

    expect(await derivative_provider.getContract("name")).to.equal(await derivative_provider.getContract("name"));
    expect(await derivative_provider.owner()).to.equal(owner);
    expect(await derivative_provider.owner()).to.equal(owner);
  });
});