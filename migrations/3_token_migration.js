const HVtoken = artifacts.require("HVtoken");
const Dex = artifacts.require("Dex");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(HVtoken);

};