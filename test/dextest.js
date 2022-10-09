const Dex = artifacts.require("Dex")
const HVtoken = artifacts.require("HVtoken")
const truffleAssert = require('truffle-assertions');


contract("Dex", accounts => {
  it("should throw if not enough eth to buy", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await truffleAssert.reverts(
      dex.createLimitOrder(0, web3.utils.fromUtf8("HV"), 10, 1)
    )
    dex.depositEth({value: 10})
    await truffleAssert.passes(
      dex.createLimitOrder(0, web3.utils.fromUtf8("HV"), 10, 1)
    )
  })

  it("should throw if not enough tokens to sell", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await truffleAssert.reverts(
      dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 10, 1)
    )
    await token.approve(dex.address, 500)
    await dex.addToken(web3.utils.fromUtf8("HV"), token.address, {from: accounts[0]})
    await dex.deposit(10, web3.utils.fromUtf8("HV"))
    await truffleAssert.passes(
      dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 10, 1)
    )
  })

  it("should rank the buy orders in descending value", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await token.approve(dex.address, 500)
    await dex.depositEth({value: 3000})
    await dex.createLimitOrder(0, web3.utils.fromUtf8("HV"), 1, 300)
    await dex.createLimitOrder(0, web3.utils.fromUtf8("HV"), 1, 100)
    await dex.createLimitOrder(0, web3.utils.fromUtf8("HV"), 1, 200)
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 0)
    console.log(orderbook)
    for (let i = 0; i < orderbook.length - 1; i++) {
      assert(orderbook[i].price >= orderbook[i+1].price, "the buy order book should be in descending price order")
    }
  })

  it("should rank the sell orders in descending value", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await token.approve(dex.address, 500)
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 1, 300)
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 1, 100)
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 1, 200)
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 1)
    console.log(orderbook)
    for (let i = 0; i < orderbook.length - 1; i++) {
      assert(orderbook[i].price <= orderbook[i+1].price, "the sell order book should be in ascending price order")
    }
  })


})
