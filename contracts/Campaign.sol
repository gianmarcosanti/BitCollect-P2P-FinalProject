pragma solidity >=0.5.6 <0.7.0;

contract Campaign {

    //events
    event CampaignCreated(string campaign);
    event launched();
    event expired();
    event disabled();
    event DonationWithdrawn(address beneficiary);
    event DonationMade(address organizator);
    event MilestoneReached(uint amount);
    
    //enums
    enum State {WIP, LAUNCHED, EXPIRED, DISABLED}
    
    //structs
    struct Donation{
        uint amount;
        uint[] partitions;
    }

    //fields
    uint public initialDonationCount;
    uint public deadline;
    uint public balance;
    uint[] milestones;
    address[] public organizers;
    address[] public beneficiaries;
    string public name;
    State public state;
    mapping (address => uint) public organizersXInitialDonation;
    mapping (address => uint) public amountXBeneficiary;
    mapping (address => Donation[]) public donations;
    mapping (uint => bool) public milestonesLedger;


    constructor (address[] memory _organizers, address[] memory _beneficiaries, string memory _name, uint _deadline, uint[] memory _milestones) public {

        require(_organizers.length >= 1, "Organizers must be at least one!");
        require(_beneficiaries.length >= 1, "Beneficiaries must be at least one!");

        organizers=_organizers;
        beneficiaries=_beneficiaries;
        name= _name;
        deadline = _deadline;
        balance = 0;
        initialDonationCount=0;
        milestones = _milestones;
        for(uint i=0; i < milestones.length - 1 ; i ++ ){
            require(milestones[i] < milestones[i+1], "Milestones should be ordered!");
        }

        emit CampaignCreated(name);
    }

    //modifiers
    modifier onlyOrganizers(){
        bool isOrganizer = false;
        for(uint8 i=0; i<organizers.length; i++){
            if(msg.sender == organizers[i]){
                isOrganizer = true;
            }
        }
        require(isOrganizer == true, "Only organizers can access this functionality!");
        _;
    }
    
    modifier checkBeneficiary(address _beneficiary){
        bool isBeneficiary = false;
        for(uint8 i=0; i<beneficiaries.length; i++){
            if(_beneficiary == beneficiaries[i]){
                isBeneficiary = true;
            }
        }
        require(isBeneficiary == true, "Only beneficiaries can access this functionality!");
        _;
    }
    
    modifier onlyWIP(){
        if(state == State.LAUNCHED){
            revert("You cannot modify a launched campaign!");
        }else if(state == State.EXPIRED){
            revert("You cannot modify an expired campaign!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadline){
            state = State.EXPIRED;

            emit expired();

            revert("This campaign is already expired!");
        }
        _;
    }
    
    modifier onlyLAUNCHED(){
        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }else if(state == State.EXPIRED){
            revert("This campaign is already expired!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadline){
            state = State.EXPIRED;

            emit expired();

            revert("This campaign is already expired!");
        }
        _;
    }
    
    modifier onlyEXPIRED(){
        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }else if(state == State.LAUNCHED){
            revert("This campaign is still active!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadline){
            state = State.EXPIRED;

            emit expired();

        }
        _;
    }

    modifier notDISABLED(){
        if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }
        _;
    }
    
    modifier checkPartitions(uint[] memory _partitions){
        require(_partitions.length == beneficiaries.length, "You have to specify a partition for each beneficiary!");

        uint total = 0;
        for(uint i=0; i<_partitions.length; i++){
            total += _partitions[i];
        }

        require(total == 100, "The sum of partitions is not 100%");

        _;
    }

    //methods
    function launch() onlyWIP() public onlyOrganizers(){

        require(initialDonationCount == organizers.length, "Cannot launch the campaign before all organizer have made the initial donation!");
        state = State.LAUNCHED;

        emit launched();
    }

    function makeInitialDonation(uint[] memory _partitions) public checkPartitions(_partitions) onlyOrganizers() onlyWIP() payable {
        require(msg.value > 0 , "The initial donation must be greater than 0!");

        if(organizersXInitialDonation[msg.sender] == 0){
            organizersXInitialDonation[msg.sender] = msg.value;
            initialDonationCount ++;
        }else{
            revert("The initial donation can be made only once!");
        }

        makePartition(_partitions);

        donations[msg.sender].push(Donation(msg.value, _partitions));

        if(initialDonationCount == organizers.length){
            state = State.LAUNCHED;

            emit launched();
        }

    }

    function makeDonation(uint[] memory _partitions) public onlyLAUNCHED()  payable {

        require(msg.value > 0, "The donated amount cannot be null!");

        makePartition(_partitions);

        donations[msg.sender].push(Donation(msg.value, _partitions));

    }

    function makePartition(uint[] memory _partitions) internal checkPartitions(_partitions) {

        for(uint i=0; i<beneficiaries.length; i++){
            amountXBeneficiary[beneficiaries[i]] += msg.value*_partitions[i]/100;
        }

        balance+= msg.value;

        checkMilestone();

        emit DonationMade(msg.sender);
    }

    function checkMilestone() internal {

        for(uint i=0; i<milestones.length; i++){
            if(milestonesLedger[milestones[i]] == true){
                continue;
            }else{
                if(milestones[i] < balance){
                    milestonesLedger[milestones[i]] = true;

                    emit MilestoneReached(milestones[i]);
                }

                break;
            }
        }

    }

    function withdraw() public onlyEXPIRED() checkBeneficiary(msg.sender) {

        uint amount = amountXBeneficiary[msg.sender];
        balance = balance - amount;
        amountXBeneficiary[msg.sender] = 0;

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success == true, "Error while withdrawing the donations!");

        emit DonationWithdrawn(msg.sender);
    }

    function getOrganizers() public view notDISABLED() returns( address[] memory result){
        return organizers;
    }

    function getBeneficiaries() public view notDISABLED() returns( address[] memory result){
        return beneficiaries;
    }

    function closeCampaign() public  onlyLAUNCHED() onlyOrganizers(){
        state = State.EXPIRED;

        emit expired();
    }

    function disableCampaign() public onlyOrganizers() onlyEXPIRED() {
        require(balance == 0, "Some funds has not been withdrawn yet!");

        state = State.DISABLED;

        emit disabled();
    }

}