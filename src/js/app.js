App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    campaigns: [],
    loadedCampaign: null,
    loadedCampaignData: {},

    init: function () {
        return App.initWeb3();
    },

    initWeb3: function () {
        if (typeof web3 !== 'undefined') {
            // If a web3 instance is already provided by Meta Mask.
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            // Specify default instance if no web3 instance provided
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
        }
        var version = web3.version.api;
        console.log(version);
        return App.initContract();
    },

    initContract: function () {
        web3.eth.getCoinbase(function (err, account) {
            if (err === null) {
                App.account = account;
            }
        });

        $.getJSON("ThirdPartyContract.json", function (thirdParty) {
            // Instantiate a new truffle contract from the artifact
            let address = thirdParty["networks"]["5777"]["address"];
            App.contracts.ThirdPartyContract = new web3.eth.Contract(thirdParty["abi"], address);
            // Connect provider to interact with contract
            App.contracts.ThirdPartyContract.setProvider(App.web3Provider);
        }).done(function () {
            $.getJSON("CampaignFactory.json", function (factory) {
                // Instantiate a new truffle contract from the artifact
                let address = factory["networks"]["5777"]["address"];
                App.contracts.CampaignFactory = new web3.eth.Contract(factory["abi"], address);
                // Connect provider to interact with contract
                App.contracts.CampaignFactory.setProvider(App.web3Provider);

            }).done(function () {
                $.getJSON("Campaign.json", function (campaign) {
                    // Instantiate a new truffle contract from the artifact
                    App.contracts.Campaign = new web3.eth.Contract(campaign["abi"]);
                    // Connect provider to interact with contract
                    App.contracts.Campaign.setProvider(App.web3Provider);

                }).done(function () {

                    return App.render();
                });
            });
        });
    },

    render: function () {

        // Load account data
        web3.eth.getCoinbase(function (err, account) {
            if (err === null) {
                App.account = account;
                console.log("account: " + account);
            }
        });

        console.log(App.campaigns);
        App.contracts.CampaignFactory.methods.nextIndex().call().then(index => console.log(index));

        App.contracts.CampaignFactory.methods.getDeployedCampaigns().call().then(async function (instances) {
            if (App.campaigns.length === 0) {
                for (let i = 0; i < instances.length; i++) {
                    App.campaigns.push(instances[i]);
                }
            } else {
                for (let i = App.campaigns.length; i < instances.length; i++) {
                    App.campaigns.push(instances[i]);
                }
            }
        });
    },

    create: async function () {

        let name = $("#campaignName").val();
        let organizers = [App.account];
        let beneficiaries = [];
        let deadlines = [];
        let milestones = [];

        if ($("#otherOrganizers").val() !== "") {
            $("#otherOrganizers").val().split(",").forEach(item => organizers.push(item.trim()));
        }
        $("#beneficiaries").val().split(",").forEach(item => beneficiaries.push(item.trim()));
        $("#deadlines").val().split(",").forEach(item => deadlines.push(item.trim()));
        $("#milestones").val().split(",").forEach(item => milestones.push(item.trim()));


        await App.contracts.CampaignFactory.methods.create(organizers, beneficiaries, name, deadlines, milestones, App.contracts.ThirdPartyContract["_address"]).send({from: App.account}).then(function (result) {
            console.log("Campaign created!");
        });

        return App.render();
    },

    getCampaign: async function () {

        let address = $("#searchValue").val();

        let status = ["WIP", "LAUNCHED", "EXPIRED", "DISABLED", "BLOCKED"];

        await $.getJSON("Campaign.json", function (campaign) {
            // Instantiate a new truffle contract from the artifact
            App.loadedCampaign = new web3.eth.Contract(campaign["abi"], address);
            // Connect provider to interact with contract
            App.loadedCampaign.setProvider(App.web3Provider);


        });
        App.loadedCampaignData["state"] = await App.loadedCampaign.methods.state().call().then(function (state) {
            //$("loaded-campaign-status").html("Status: "+state);
            return state;
        });
        App.loadedCampaignData["name"] = await App.loadedCampaign.methods.name().call().then(function (name) {
            //$("loaded-campaign-name").html(name);
            return name;
        });
        App.loadedCampaignData["beneficiaries"] = await App.loadedCampaign.methods.getBeneficiaries().call().then(function (beneficiaries) {
            //$("loaded-campaign-deadline").html(currentDeadline);
            return beneficiaries;
        });
        App.loadedCampaignData["balance"] = await App.loadedCampaign.methods.balance().call().then(function (balance) {
            //$("loaded-campaign-balance").html(balance);
            return balance;
        });
        let beneficiariesHTML = "";
        App.loadedCampaignData["beneficiaries"].forEach(beneficiary => beneficiariesHTML += `<div class="row"> ${beneficiary}</div>`);

        let campaignHtml = `               <div class="jumbotron">
            <h3 class="display-4"></h3>
            <div id="campaign-details">
                <div class="row">
                    <div class="col">
                        <label id='loaded-campaign-name'>${App.loadedCampaignData["name"].toString()}</label>
                    </div>
                    <div class="col">
                        <label id='loaded-campaign-status'>Status: ${status[App.loadedCampaignData["state"]]}</label>
                    </div>
                    <div class="col">
                        <div class="row">
                            <div class="col"><label id='loaded-campaign-beneficiaries'> Beneficiaries: </label></div><div class="col">${beneficiariesHTML}</div>
                        </div>
                    </div>
                    <div class="col">
                        <label id='loaded-campaign-balance'> Balance: ${Web3.utils.fromWei(App.loadedCampaignData["balance"])} ETH</label>
                    </div>
                </div>
            </div>
            <hr class="my-4">
            <form id='donation-form' onsubmit='App.donate(); return false;'>
                <label> Donate:</label>
                <div class="row">
                    <div class="col">
                        <input type="text" id="donation-amount" class="form-control" placeholder="Amount">
                    </div>
                    <div class="col">
                        <input type="text" id="donation-partition" class="form-control" placeholder="Partition">
                    </div>
                </div>
                </br>
                <button type="submit" class="btn btn-primary btn-lg">Donate</button>
            </form>
            <hr class="my-4">
            <form id='report-form' onsubmit='App.report(); return false;'>
                <div class="row">
                    <div class="col">
                        <label for="investment-amount"> Report:</label>
                        <input type="text" id="investment-amount" class="form-control" placeholder="Investment">
                    </div>
                </div>
                </br>
                <button type="submit" class="btn btn-primary btn-lg">Report</button>
            </form>
            <hr class="my-4">
            <form id='report-form' onsubmit='App.withdraw(); return false;'>
                <button type="submit" class="btn btn-primary btn-lg">Withdraw funds</button>
            </form>
        </div>
`;

        $("#campaign").append(campaignHtml);

    },

    donate: function () {
        if (App.loadedCampaignData["state"] === "0") {
            return App.makeInitialDonation();
        } else if (App.loadedCampaignData["state"] === "1") {
            return App.makeDonation();
        }
    },

    makeDonation: function () {
        let amount = parseInt($("#donation-amount").val().trim());
        let partitions = [];
        $("#donation-partition").val().split(",").forEach(partition => partitions.push(parseInt(partition.trim())));

        App.loadedCampaign.methods.makeDonation(partitions).send({from: App.account, value: amount});
    },

    makeInitialDonation: function () {
        let amount = parseInt($("#donation-amount").val().trim());
        let partitions = [];
        $("#donation-partition").val().split(",").forEach(partition => partitions.push(parseInt(partition.trim())));

        App.loadedCampaign.methods.makeInitialDonation(partitions).send({from: App.account, value: amount});
    },

    addReward: async function () {
        let address = $("#campaign-rewarder").val();
        let prizes = [];
        let milestones = [];

        $("#milestones-rewarder").val().split(",").forEach(milestone => milestones.push(milestone.trim()));
        $("#rewards-rewarder").val().split(",").forEach(prize => prizes.push(prize.trim()));
        let amount = 0;
        prizes.forEach(prize => amount += parseInt(prize));

        if (prizes.length === milestones.length) {
            console.log(App.account)
            await App.contracts.ThirdPartyContract.methods.addRewards(address, milestones, prizes).send({
                from: App.account,
                value: amount.toString()
            })
        } else {
            alert("Milestones and rewards must be the same number!");
        }
    },

    report: async function () {
        let amount = $("#investment-amount").val();

        await App.loadedCampaign.methods.reportFraud().send({from: App.account, value: amount});

    },

    withdraw: function () {
        if (App.loadedCampaignData["state"] === "2") {
            return App.withdrawFunds();
        } else if (App.loadedCampaignData["state"] === "4") {
            return App.takeBack();
        } else {
            alert("Cannot withdraw yet!")
        }
    },

    takeBack: async function () {

        await App.loadedCampaign.methods.takeBackDonation().send({from: App.account});
    },

    withdrawFunds: async function () {
        await App.loadedCampaign.methods.withdraw().send({from: App.account});

        await App.loadedCampaign.events.DonationWithdrawn(function (error, event) {
            console.log(event);
        });

    },

    close: async function () {
        let address = $("#campaign-address").val();

        await $.getJSON("Campaign.json", function (campaign) {
            // Instantiate a new truffle contract from the artifact
            App.loadedCampaign = new web3.eth.Contract(campaign["abi"], address);
            // Connect provider to interact with contract
            App.loadedCampaign.setProvider(App.web3Provider);

        });

        await App.loadedCampaign.methods.closeCampaign().send({from: App.account});

    },

    disable: async function () {
        let address = $("#campaign-address").val();

        await $.getJSON("Campaign.json", function (campaign) {
            // Instantiate a new truffle contract from the artifact
            App.loadedCampaign = new web3.eth.Contract(campaign["abi"], address);
            // Connect provider to interact with contract
            App.loadedCampaign.setProvider(App.web3Provider);

        });

        await App.loadedCampaign.methods.disableCampaign().send({from: App.account});
    },
    takeBackReward: async function () {
        let address = $("#campaign-address").val();

        await $.getJSON("Campaign.json", function (campaign) {
            // Instantiate a new truffle contract from the artifact
            App.loadedCampaign = new web3.eth.Contract(campaign["abi"], address);
            // Connect provider to interact with contract
            App.loadedCampaign.setProvider(App.web3Provider);

        });

        await App.contracts.ThirdPartyContract.methods.takeBackReward(address).send({from: App.account});

    }

};

$(function () {
    $(window).on("load", function () {

        App.init();
    });
});


