const Campaign = artifacts.require("Campaign");
const truffleAssert = require("truffle-assertions");




contract("Campaign", async accounts => {
    it("Initial donation",async function() {
        let organizers = accounts.slice(0,3);
        let name = "prova1";
        let beneficiaries = accounts.slice(3,6);
        let deadline = 10000000000000;
        let donation = 10000000000000000000;
        let partition = [80,10,10];
        let milestones = ["10000000000000000000","20000000000000000000", "1000000000000000000"];
        await truffleAssert.reverts(
            Campaign.new(organizers,beneficiaries,name,deadline,milestones),
            "Milestones should be ordered!"
        );

        milestones.splice(-1,1);
        let instance = await Campaign.new(organizers,beneficiaries,name,deadline,milestones);

        let result = await instance.initialDonationCount();
        assert.equal(0,result);
        result = await instance.state();
        assert.equal(0, result);
        instance.makeInitialDonation(partition, {from:organizers[0], value:donation});
        result = await instance.initialDonationCount();
        assert.equal(1, result);
        result = await instance.state();
        assert.equal(0, result);
        instance.makeInitialDonation(partition, {from:organizers[1], value:donation});
        result = await instance.initialDonationCount();
        assert.equal(2, result);
        result = await instance.state();
        assert.equal(0, result);
        await truffleAssert.reverts(
            instance.makeDonation(partition,{from:accounts[7], value:donation}),
            "This campaign has not been launched yet!"
        );
        await truffleAssert.reverts(
            instance.makeInitialDonation(partition, {from:organizers[1], value:donation}),
            "The initial donation can be made only once!"
        );
        await truffleAssert.reverts(
            instance.makeInitialDonation(partition, {from:organizers[2], value:0}),
            "The initial donation must be greater than 0!"
        );
        instance.makeInitialDonation(partition, {from:organizers[2], value:donation});
        result = await instance.initialDonationCount();
        assert.equal(3, result);
        result = await instance.balance();
        assert.equal(donation*3, result);

        result = await instance.initialDonationCount();
        assert.equal(3, result);

        result =await instance.state();
        assert.equal(1, result);

        instance.makeDonation(partition,{from:accounts[7], value:donation});
        result = await instance.balance();
        assert.equal(40000000000000000000, result);
        await truffleAssert.reverts(
            instance.makeDonation(partition,{from:accounts[7], value:0}),
            "The donated amount cannot be null!"
        );

        await truffleAssert.reverts(
            instance.withdraw({from:beneficiaries[0]}),
            "This campaign is still active!"
        );

        instance.closeCampaign({from:organizers[0]});
        result = await instance.state();
        assert.equal(2, result);
        await truffleAssert.reverts(
            instance.makeDonation(partition,{from:accounts[7], value:0}),
            "This campaign is already expired!"
        );

        await instance.withdraw({from:beneficiaries[0]});
        result = await instance.balance();
        assert.equal(8000000000000000000, result);
        await instance.withdraw({from:beneficiaries[1]});
        result = await instance.balance();
        assert.equal(4000000000000000000, result);
        await truffleAssert.reverts(
            instance.disableCampaign({from:organizers[2]}),
            "Some funds has not been withdrawn yet!"
        );

        await instance.withdraw({from:beneficiaries[2]});
        result = await instance.balance();
        assert.equal(0, result);
        let expectedBalance = await web3.eth.getBalance(instance.address);
        assert.equal(0, expectedBalance);

        await instance.disableCampaign({from:organizers[2]});
        result = await instance.state();
        assert.equal(3, result);

    })
});

