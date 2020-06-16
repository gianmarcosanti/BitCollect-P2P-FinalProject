pragma solidity >=0.6.0 <0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Campaign.sol";

contract ThirdPartyContract is Ownable{

    using SafeMath for uint256;

    //events
    event AwardWithdrawn(address campaign, uint amount);

    //structs
    struct Reward{
        uint milestone;
        uint reward;
        bool withdrawn;
    }
    //fields
    address[] public campaigns;
    mapping (address => Reward[]) public rewardLedger;

    constructor () public {}

    //Modifiers
    modifier ordered(uint[] memory data){
        for(uint i=0; i < data.length - 1 ; i ++ ){
            require(data[i] < data[i+1], "Data should be ordered!");
        }
        _;
    }

    modifier checkBeneficiary(){

        require(rewardLedger[msg.sender].length > 0, "There is no prize for the current campaign!");
        _;
    }

    //methods
    function addRewards(address _campaign, uint[] memory _milestones, uint[] memory _rewards) public payable onlyOwner ordered(_rewards) ordered(_milestones) {

        require(_milestones.length == _rewards.length, "Milestones and rewards' length must be equal!");

        uint sum = 0;

        for(uint i=0; i<_rewards.length; i++){
            sum = sum.add(_rewards[i]);
        }

        require(msg.value >= sum, "You must fund the contract with enough ether!");

        for(uint i=0; i<_milestones.length; i++){
            rewardLedger[_campaign].push(Reward(_milestones[i], _rewards[i], false));
        }

    }

    function withdrawPrize() public checkBeneficiary returns(uint){

        uint prize = 0;

        for(uint i=0; i<rewardLedger[msg.sender].length; i++){
            if(rewardLedger[msg.sender][i].withdrawn == false ){
                if(rewardLedger[msg.sender][i].milestone <= msg.sender.balance){
                    prize = prize.add(rewardLedger[msg.sender][i].reward);
                    rewardLedger[msg.sender][i].withdrawn = true;
                }else{
                    break;
                }
            }
        }


        (bool success, ) = msg.sender.call.value(prize)("");
        require(success == true, "Error while paying the campaign!");

        emit AwardWithdrawn(msg.sender, prize);

        return prize ;
    }

    function takeBackReward(Campaign _campaign) public onlyOwner {

        _campaign.takeBackDonation();

    }

    receive() external payable {}

}