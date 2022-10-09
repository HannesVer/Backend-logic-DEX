const Dex = artifacts.require("Dex")
const HVtoken = artifacts.require("HVtoken")
const truffleAssert = require('truffle-assertions');


contract("Dex", accounts => {
  it("should only be possible for the owner to add tokens", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await truffleAssert.passes(
      dex.addToken(web3.utils.fromUtf8("HV"), token.address, {from: accounts[0]})
    )
    await truffleAssert.reverts(
      dex.addToken(web3.utils.fromUtf8("AAVE"), token.address, {from: accounts[1]})
    )
  })

  it("Should handle deposits correctly", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await token.approve(dex.address, 500);
    await dex.deposit(100, web3.utils.fromUtf8("HV"));
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("HV"))
    assert.equal( balance.toNumber(), 100 )
  })

  it("Should handle faulty withdrawals correctly", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await truffleAssert.reverts(dex.withdraw(500, web3.utils.fromUtf8("HV")))
  })

  it("Should handle correct withdrawals correctly", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await truffleAssert.passes(dex.withdraw(50, web3.utils.fromUtf8("HV")))
  })
})