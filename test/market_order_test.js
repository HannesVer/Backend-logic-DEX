const Dex = artifacts.require("Dex")
const HVtoken = artifacts.require("HVtoken")
const truffleAssert = require('truffle-assertions');


contract("Dex", accounts => {
  it("should not allow a user to sell a token it doesnt have (enough of) or custody over", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("HV"))
    assert.equal( balance.toNumber(), 0, "Initial HV balance is not 0" );
    await truffleAssert.reverts(
      dex.createMarketOrder(1, web3.utils.fromUtf8("HV"), 10)
    )
  })

  // it("should allow a user with enough of the token to sell to sell that token", async () => {
  //   let dex = await Dex.deployed()
  //   let token = await HVtoken.deployed()
  //   await token.approve(dex.address, 500)
  //   await dex.addToken(web3.utils.fromUtf8("HV"), token.address, {from: accounts[0]})
  //   await dex.deposit(10, web3.utils.fromUtf8("HV"))
  //   await truffleAssert.passes(
  //     dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 10)
  //   )
  // })
  it("should allow market orders to be submitted even if the order book is empty", async () => {
    let dex = await Dex.deployed()
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 0)
    await dex.depositEth({value: 10000});
    assert.equal( orderbook.length, 0, "Orderbook is not empty" );
    await truffleAssert.passes(
      dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 10)
    )
  })


  it("should not allow a user to buy a token if he doesnt have enough eth", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
    assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );   
    await truffleAssert.reverts(
      dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 10)
    )
  })

  it("mkt order should be filled to 100%", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    //hand dummy accounts some token balance
    await token.transfer(accounts[1], 50)
    await token.transfer(accounts[1], 40)
    await token.transfer(accounts[1], 35)
    //send contract some eth
    await dex.depositEth({value: 10000});
    //give custody
    await token.approve(dex.address, 100, {from: accounts[1]})
    await token.approve(dex.address, 100, {from: accounts[2]})
    await token.approve(dex.address, 100, {from: accounts[3]})
    //send these tokens over to the contract
    await dex.deposit(50, web3.utils.fromUtf8("HV"), {from: accounts[1]})
    await dex.deposit(40, web3.utils.fromUtf8("HV"), {from: accounts[2]})
    await dex.deposit(35, web3.utils.fromUtf8("HV"), {from: accounts[3]})

    //creating market sell orders from those accounts
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 10, 100, {from: accounts[1]})
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 15, 101, {from: accounts[2]})
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 20, 102, {from: accounts[3]})
    //creating market buy order
    await dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 25)
    // check if orderbook is now indeed 1
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 1)
    assert.equal( orderbook.length, 1, "orderbook length is not 1");
    assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");
  })

  it("mkt order should not be filled to an extent where there's not enough limit sell orders", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()

    //filling in some new orders
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 3, 20, {from: accounts[1]})
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 1, 10, {from: accounts[2]})
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 1)
    assert.equal( orderbook.length, 3, "orderbook length is not 3");


    //check if the before and after balances are correct
    let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
    // create new market buy order
    await dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 100)
    let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
    //check if orderbook buy side still 1
    let orderbookafter = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 0)
    assert.equal( orderbookafter.length, 1, "orderbook length is not 1");
    // check if the token balance updated correctly
    assert.equal( balanceBefore.toNumber() + 4, balanceAfter.toNumber(), "balances did not update correctly");
  })

  it("should make sure the ETH balance of the buyer decreases with the right amount", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await token.approve(dex.address, 500, {from: accounts[1]});   
    let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
    await token.transfer(accounts[1], 50)
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 3, 300, {from: accounts[1]})
    //now create the buy order
    dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 1)
    let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
    assert.equal( balanceBefore.toNumber() - 100, balanceAfter.toNumber(), "Failed to deduct the right amount of ETH" );
  })

  //.
  it("should make sure The token balances of the limit order sellers should decrease with the filled amounts", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    //approve custody
    await token.approve(dex.address, 500, {from: accounts[1]});   
    await token.approve(dex.address, 500, {from: accounts[2]});   

    // make sure enough initial balance
    
    await token.transfer(accounts[1], 50)
    await token.transfer(accounts[2], 50)

    //check the before balances
    let balanceBeforeAcc1 = await dex.balances(accounts[1], web3.utils.fromUtf8("HV"))
    let balanceBeforeAcc2 = await dex.balances(accounts[2], web3.utils.fromUtf8("HV"))

    // set the orders

    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 30, 300, {from: accounts[1]})
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 25, 250, {from: accounts[1]})

    //now create the buy order
    await dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 55)
    // check balances after

    let balanceAfterAcc1 = await dex.balances(accounts[1], web3.utils.fromUtf8("HV"))
    let balanceAfterAcc2 = await dex.balances(accounts[2], web3.utils.fromUtf8("HV"))

    assert.equal( balanceBeforeAcc1.toNumber() - 30, balanceAfterAcc1.toNumber(), "Failed to deduct the right amount of HV token" );
    assert.equal( balanceBeforeAcc2.toNumber() - 25, balanceAfterAcc2.toNumber(), "Failed to deduct the right amount of HV token" );
  })

  it("Filled limit orders should be removed from the orderbook", async () => {
    let dex = await Dex.deployed()
    let token = await HVtoken.deployed()
    await dex.addToken(web3.utils.fromUtf8("HV"), token.address)

    await token.approve(dex.address, 500);
    await dex.deposit(50, web3.utils.fromUtf8("HV"));
    
    await dex.depositEth({value: 10000});
    // set the orders
    await dex.createLimitOrder(1, web3.utils.fromUtf8("HV"), 30, 300, {from: accounts[1]})
    let orderbookBefore = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 1)
    await dex.createMarketOrder(0, web3.utils.fromUtf8("HV"), 30)
    let orderbookAfter = await dex.getOrderBook(web3.utils.fromUtf8("HV"), 1)
    assert.equal( orderbookBefore.toNumber() - 1, orderbookAfter.toNumber(), "Failed to remove the order from the orderbook" );
  })
})
