const Migrations = artifacts.require("Migrations");
const Factory = artifacts.require("CampaignFactory");
const ThirdPartyContract = artifacts.require("ThirdPartyContract");


module.exports = function(deployer, network, accounts) {
  deployer.deploy(Migrations);
  deployer.deploy(ThirdPartyContract, {from:accounts[9]});
  deployer.deploy(Factory, {from:accounts[8]});

};
