pragma solidity >=0.5.6 <0.7.0;

import "./Campaign.sol";


contract CampaignFactory {

    uint public nextIndex;
    mapping (address => uint) indexes;
    Campaign[] public instances;

    constructor() public {
        nextIndex = 0;
    }

    function create(address[] memory _organizers, address[] memory _beneficiaries, string memory _name, uint[] memory _deadlines, uint[] memory _milestones, ThirdPartyContract _tpContractAddress) public {


        Campaign newInstance = new Campaign(_organizers, _beneficiaries, _name, _deadlines, _milestones, _tpContractAddress);
        instances.push(newInstance);
        indexes[address(newInstance)] = nextIndex;
        nextIndex++;

    }

    function getDeployedCampaigns() public view returns(Campaign[] memory){
        return instances;
    }
}
