const Factory = artifacts.require("CampaignFactory");
const Campaign = artifacts.require("Campaign");
const ThirdPartyContract = artifacts.require("ThirdPartyContract");
const Web3 = require('web3')



contract("Campaign", async accounts => {

    it("Campaign gone successfully",async function() {
        let tpInstance = await ThirdPartyContract.new({from:accounts[9]});
        let factory = await Factory.new({from:accounts[8]});
        let organizers = accounts.slice(0,3);
        let name = "Successful campaign";
        let beneficiaries = accounts.slice(3,5);
        let donors = accounts.slice(0,9);
        let deadlines = [1623708000,1631656800,1639522800,1647298800]; //15/06/2021, 15/09/2021, 15/12/2021, 15/03/2022
        let donation = Web3.utils.toWei('1', 'ether').toString();
        let fraudInvestment = Web3.utils.toWei('0.1', 'ether').toString();
        let partition = [80, 20];
        let milestones = [Web3.utils.toWei('1', 'ether').toString(),Web3.utils.toWei('2', 'ether').toString(), Web3.utils.toWei('3', 'ether').toString()];
        let prizes = [Web3.utils.toWei('0.1', 'ether').toString(),Web3.utils.toWei('0.2', 'ether').toString(),Web3.utils.toWei('0.3', 'ether').toString()];

        await factory.create(organizers, beneficiaries, name, deadlines, milestones, tpInstance.address, {from: organizers[0]});

        let instanceAddress = await factory.instances(0, {from:organizers[0]});

        let instance = await Campaign.at(instanceAddress)

        let amount = 0;
        prizes.forEach(prize => amount += parseInt(prize));


        await tpInstance.addRewards(instanceAddress, milestones, prizes, {from:accounts[9], value:amount.toString()});


        organizers.forEach(async organizer => await instance.makeInitialDonation(partition, {from:organizer, value:donation}));

        donors.forEach(async donor => await instance.makeDonation(partition,{from:donor, value:donation}));

        await instance.closeCampaign({from:organizers[0]});

        beneficiaries.forEach( async beneficiary => await instance.withdraw({from:beneficiary}));

        await instance.disableCampaign({from: organizers[0]});

    });
    it("Fraudulent campaign",async function() {
        let tpInstance = await ThirdPartyContract.new({from:accounts[9]});
        let factory = await Factory.new({from:accounts[8]});
        let organizers = accounts.slice(0,3);
        let name = "Fraudulent campaign";
        let beneficiaries = accounts.slice(3,5);
        let donors = accounts.slice(0,5);
        let reporters = accounts.slice(3,9);
        let deadlines = [1623708000,1631656800,1639522800,1647298800]; //15/06/2021, 15/09/2021, 15/12/2021, 15/03/2022
        let donation = Web3.utils.toWei('1', 'ether').toString();
        let fraudInvestment = Web3.utils.toWei('0.1', 'ether').toString();
        let partition = [80, 20];
        let milestones = [Web3.utils.toWei('1', 'ether').toString(),Web3.utils.toWei('2', 'ether').toString(), Web3.utils.toWei('3', 'ether').toString()];
        let prizes = [Web3.utils.toWei('0.1', 'ether').toString(),Web3.utils.toWei('0.2', 'ether').toString(),Web3.utils.toWei('0.3', 'ether').toString()];

        await factory.create(organizers, beneficiaries, name, deadlines, milestones, tpInstance.address, {from: organizers[0]});

        let instanceAddress = await factory.instances(0, {from:organizers[0]});

        let instance = await Campaign.at(instanceAddress)

        let amount = 0;
        prizes.forEach(prize => amount += parseInt(prize));


        await tpInstance.addRewards(instanceAddress, milestones, prizes, {from:accounts[9], value:amount.toString()});

        organizers.forEach(async organizer => await instance.makeInitialDonation(partition, {from:organizer, value:donation}));

        donors.forEach(async donor => await instance.makeDonation(partition,{from:donor, value:donation}));

        reporters.forEach( async reporter => await instance.reportFraud({from: reporter, value:fraudInvestment}));

        donors.forEach( async donor => await instance.takeBackDonation({from:donor}));

        reporters.forEach( async reporter => await instance.takeBackDonation({from:reporter}));

        await tpInstance.takeBackReward(instanceAddress, {from:accounts[9]});

        await instance.disableCampaign({from: organizers[0]});
    });

    it("Campaign gone successfully gas consumption",async function() {
        let tpInstance = await ThirdPartyContract.new({from:accounts[9]});
        let factory = await Factory.new({from:accounts[8]});
        let organizers = accounts.slice(0,3);
        let name = "Successful campaign";
        let beneficiaries = accounts.slice(3,5);
        let donors = accounts.slice(0,9);
        let deadlines = [1623708000,1631656800,1639522800,1647298800]; //15/06/2021, 15/09/2021, 15/12/2021, 15/03/2022
        let donation = Web3.utils.toWei('1', 'ether').toString();
        let fraudInvestment = Web3.utils.toWei('0.1', 'ether').toString();
        let partition = [80, 20];
        let milestones = [Web3.utils.toWei('1', 'ether').toString(),Web3.utils.toWei('2', 'ether').toString(), Web3.utils.toWei('3', 'ether').toString()];
        let prizes = [Web3.utils.toWei('0.1', 'ether').toString(),Web3.utils.toWei('0.2', 'ether').toString(),Web3.utils.toWei('0.3', 'ether').toString()];

        let gas = await factory.create(organizers, beneficiaries, name, deadlines, milestones, tpInstance.address, {from: organizers[0]}).then( result => {return result.receipt.gasUsed});
        console.log("Creation of campaign: " + gas)

        let instanceAddress = await factory.instances(0, {from:organizers[0]});

        let instance = await Campaign.at(instanceAddress);

        let amount = 0;
        prizes.forEach(prize => amount += parseInt(prize));

        gas = await tpInstance.addRewards(instanceAddress, milestones, prizes, {from:accounts[9], value:amount.toString()}).then( result => {return result.receipt.gasUsed});;
        console.log("Adding rewards: " + gas)

        organizers.forEach(async organizer => {
            gas = await instance.makeInitialDonation(partition, {from:organizer, value:donation}).then( result => {return result.receipt.gasUsed});
            console.log("Making initial donation: " + gas);
        });

        donors.forEach(async donor => {
            gas = await instance.makeDonation(partition,{from:donor, value:donation}).then( result => {return result.receipt.gasUsed});
            console.log("Making donation: " + gas);
        });

        gas = await instance.closeCampaign({from:organizers[0]}).then( result => {return result.receipt.gasUsed});
        console.log("Closing campaign: " + gas)

        
        beneficiaries.forEach( async beneficiary => {
            gas =await instance.withdraw({from:beneficiary}).then( result => {return result.receipt.gasUsed});
            console.log("Withdraw donation: " + gas);
        });

        gas = await instance.disableCampaign({from: organizers[0]}).then( result => {return result.receipt.gasUsed});
        console.log("Disabling campaign: " + gas)

    });
    it("Fraudulent campaign gas consumption",async function() {
        let tpInstance = await ThirdPartyContract.new({from:accounts[9]});
        let factory = await Factory.new({from:accounts[8]});
        let organizers = accounts.slice(0,3);
        let name = "Fraudulent campaign";
        let beneficiaries = accounts.slice(3,5);
        let donors = accounts.slice(0,5);
        let reporters = accounts.slice(3,9);
        let deadlines = [1623708000,1631656800,1639522800,1647298800]; //15/06/2021, 15/09/2021, 15/12/2021, 15/03/2022
        let donation = Web3.utils.toWei('1', 'ether').toString();
        let fraudInvestment = Web3.utils.toWei('0.1', 'ether').toString();
        let partition = [80, 20];
        let milestones = [Web3.utils.toWei('1', 'ether').toString(),Web3.utils.toWei('2', 'ether').toString(), Web3.utils.toWei('3', 'ether').toString()];
        let prizes = [Web3.utils.toWei('0.1', 'ether').toString(),Web3.utils.toWei('0.2', 'ether').toString(),Web3.utils.toWei('0.3', 'ether').toString()];

        let gas = await factory.create(organizers, beneficiaries, name, deadlines, milestones, tpInstance.address, {from: organizers[0]}).then( result => {return result.receipt.gasUsed});
        console.log("Creating campaign: " + gas);

        let instanceAddress = await factory.instances(0, {from:organizers[0]});

        let instance = await Campaign.at(instanceAddress)

        let amount = 0;
        prizes.forEach(prize => amount += parseInt(prize));

        gas = await tpInstance.addRewards(instanceAddress, milestones, prizes, {from:accounts[9], value:amount.toString()}).then( result => {return result.receipt.gasUsed});
        console.log("Adding rewards: " + gas);

        organizers.forEach(async organizer => {
            gas = await instance.makeInitialDonation(partition, {from:organizer, value:donation}).then( result => {return result.receipt.gasUsed});
            console.log("Making initial donation: " + gas);
        });

        donors.forEach(async donor => {
            gas = await instance.makeDonation(partition,{from:donor, value:donation}).then( result => {return result.receipt.gasUsed});
            console.log("Making donation: " + gas);
        });

        reporters.forEach( async reporter => {
            gas = await instance.reportFraud({from: reporter, value:fraudInvestment}).then( result => {return result.receipt.gasUsed});
            console.log("Reporting a campaign: " + gas);
        });

        donors.forEach( async donor => {
            gas = await instance.takeBackDonation({from:donor}).then( result => {return result.receipt.gasUsed});
            console.log("Taking back donation: " + gas);
        });

        reporters.forEach( async reporter => {
            gas = await instance.takeBackDonation({from:reporter}).then( result => {return result.receipt.gasUsed});
            console.log("Taking back investment: " + gas);
        });

        gas = await tpInstance.takeBackReward(instanceAddress, {from:accounts[9]}).then( result => {return result.receipt.gasUsed});
        console.log("Taking back reward: " + gas);

        gas = await instance.disableCampaign({from: organizers[0]}).then( result => {return result.receipt.gasUsed});
        console.log("Disabling campaign: " + gas);
    });

});
