pragma solidity >=0.4.21 <0.7.0;

import './Campaign.sol';
import './Organizer.sol';

contract  Generator {

    //events
    event CampaignCreated();


    //fields
    Campaign[] createdCampaigns;
    mapping (address => uint) public historyCreations;
    uint256 private nextRecord ;
    Organizer private organizerContract;

    //constructor
    constructor(Organizer _organizerContract) public {

        organizerContract=_organizerContract;
        nextRecord = 0;
    }


    //modifiers
    modifier onlyRegisteredOrganizers(address[] memory _addresses){

        for( uint i=0; i<_addresses.length; i++){
            require(organizerContract.isRegistered(_addresses[i]), "Only registered organizers can create a new campaign!");
        }
        _;

    }

    function create(address[] memory _organizers, string memory _name, address[] memory _beneficiaries, uint256 _deadline, uint256 _initialDonation, address _generatorAddress) public onlyRegisteredOrganizers{

        require(_organizers.length >= 1, "Organizers must be at least one!");
        require(_beneficiaries.length >= 1, "Beneficiaries must be at least one!");
        require(_initialDonation > 0, "Initial donation cannot be 0!");


        Campaign instance = new Campaign(_organizers, _name, _beneficiaries, _deadline, _initialDonation);

        for(uint i=0; i<_organizers.length; i++){
            instance.addOrganizer(_organizers[i]);
        }
        for(uint i=0; i<_beneficiaries.length; i++){
            instance.addBeneficiary(_beneficiaries[i]);
        }
        createdCampaigns.push(instance);
        historyCreations.update(address(instance), nextRecord);
        nextRecord++;

        emit CampaignCreated(address(instance), _name);
    }
}