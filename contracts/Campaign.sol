pragma solidity >=0.4.21 <0.7.0;

contract Campaign {

    //events
    event CampaignCreated();


    //fields
    address[] public organizers;
    string public name;
    address[] public beneficiaries;
    uint256 public deadline;
    uint256 public initialDonation;
    uint public balance;
    mapping (address => uint256) public donations;

    enum State {WIP, LAUNCHED, EXPIRED, DISABLED}

    State public state;


    constructor (string memory _name, uint256 _deadline, uint256 _initialDonation) public {

        name= _name;
        initialDonation = _initialDonation;
        deadline = _deadline;
        balance = 0;
    }


    modifier onlyGenerator(address _generatorAddress){
        _;
    }
    modifier onlyOrganizers(address _generatorAddress){
        _;
    }
    modifier onlyWIP(){
        if(state == State.LAUNCHED){
            revert("You cannot modify a launched campaign!");
        }
        if(state == State.EXPIRED){
            revert("You cannot modify an expired campaign!");
        }
        if(state == State.DISABLED){
            revert("This is disabled campaign!");
        }

    _;
    }
    modifier onlyLAUNCHED(){
        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }
        if(state == State.EXPIRED){
            revert("This campaign is already expired!");
        }
        if(state == State.DISABLED){
            revert("This is disabled campaign!");
        }
        _;
    }


    function addOrganizer(address _organizer) onlyGenerator(msg.sender) onlyWIP(){
        organizers.push(_organizer);
    }
    function addBeneficiary(address _beneficiary) onlyGenerator(msg.sender) onlyWIP(){
        beneficiaries.push(_beneficiary);
    }
    function launch() onlyOrganizers(msg.sender){

        require(balance/organizers.length == initialDonation, "Cannot launch the campaign before all organizer have made the initial donation!");
        state = State.LAUNCHED;
    }

    function makeInitialDonation() public onlyOrganizers(msg.sender) onlyWIP() payable {
        require(msg.value == initialDonation, "The amount does not match the initial donation!");

        balance += msg.value;

    }

    function makeDonation() public onlyLAUNCHED() payable {

        require(msg.value > 0, "The donated amount cannot be null!");

        balance += msg.value;

        uint amount = donations[msg.sender];
        if(amount != 0x0){
            amount += msg.value;
        }else{
            amount = msg.value;
        }

        donations.update(msg.sender, amount);
    }

}