pragma solidity >=0.6.0 <0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ThirdParty.sol";

contract Campaign {

    using SafeMath for uint256;

    //events
    event launched();
    event expired();
    event disabled();
    event blocked();
    event CampaignReported();
    event CampaignCreated(string campaign);
    event DonationWithdrawn(address beneficiary);
    event DonationMade(address donor);
    event DonationTookBack(address donor);
    event MilestoneReached(uint amount, address sender);

    //enums
    enum State {WIP, LAUNCHED, EXPIRED, DISABLED, BLOCKED}
    
    //structs
    struct Donation{
        uint amount;
        uint[] partitions;
    }

    //fields
    uint public initialDonationCount;
    uint public currentDeadline;
    uint public balance;
    uint public fraudThreshold;
    uint public reportersCount;
    uint[] milestones;
    uint[] deadlines;
    address[] public reporters;
    address[] public organizers;
    address[] public beneficiaries;
    string public name;
    State public state;
    ThirdPartyContract public tpContract;
    mapping (address => uint) public reports;
    mapping (address => uint) public amountXBeneficiary;
    mapping (address => Donation[]) public donations;
    mapping (uint => bool) public milestonesLedger;


    constructor (address[] memory _organizers,
        address[] memory _beneficiaries,
        string memory _name,
        uint[] memory _deadlines,
        uint[] memory _milestones,
        ThirdPartyContract _tpContractAddress
    ) public {

        require(_organizers.length >= 1, "Organizers must be at least one!");
        require(_beneficiaries.length >= 1, "Beneficiaries must be at least one!");
        require(_deadlines.length >= 1, "Deadlines must be at least one!");
        require(_deadlines.length == _milestones.length + 1, "Deadlines must be at least one!");

        organizers=_organizers;
        beneficiaries=_beneficiaries;
        name= _name;
        deadlines = _deadlines;
        for(uint i=0; i < _deadlines.length - 1 ; i ++ ){
            require(_deadlines[i] < _deadlines[i+1], "Deadlines should be ordered!");
        }
        currentDeadline = 0;
        balance = 0;
        initialDonationCount=0;
        reportersCount = 0;
        milestones = _milestones;
        for(uint i=0; i < milestones.length - 1 ; i ++ ){
            require(milestones[i] < milestones[i+1], "Milestones should be ordered!");
        }
        fraudThreshold = 5;
        tpContract =_tpContractAddress;

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
        }else if(state == State.BLOCKED){
            revert("This campaign has been blocked for fraud!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadlines[currentDeadline]){
            state = State.EXPIRED;

            emit expired();

            revert("This campaign is already expired!");
        }
        _;
    }
    
    modifier onlyLAUNCHED(){

        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }else if(state == State.BLOCKED){
            revert("This campaign has been blocked for fraud!");
        }else if(state == State.EXPIRED){
            revert("This campaign is already expired!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadlines[currentDeadline]){
            state = State.EXPIRED;

            emit expired();

            revert("This campaign is already expired!");
        }
        _;
    }

    modifier onlyEXPIRED(){
        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }else if(state == State.BLOCKED){
            revert("This campaign has been blocked for fraud!");
        }else if(state == State.LAUNCHED){
            revert("This campaign is still active!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadlines[currentDeadline]){
            state = State.EXPIRED;

            emit expired();

        }
        _;
    }

    modifier onlyEXPIREDorBLOCKED(){
        if(state == State.WIP){
            revert("This campaign has not been launched yet!");
        }else if(state == State.LAUNCHED){
            revert("This campaign is still active!");
        }else if(state == State.DISABLED){
            revert("This contract has been disabled!");
        }else if(block.timestamp > deadlines[currentDeadline]){
            state = State.EXPIRED;

            emit expired();

        }
        _;
    }

    modifier onlyBLOCKED(){
        if(state != State.BLOCKED){
            revert("A donor can take back the donation only if the campaign if blocked for fraud!");
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
            total = total.add(_partitions[i]);
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

        if(donations[msg.sender].length == 0){
            donations[msg.sender].push(Donation(msg.value, _partitions));
            initialDonationCount ++;
        }else{
            revert("The initial donation can be made only once!");
        }

        makePartition(_partitions);

        if(initialDonationCount == organizers.length){
            state = State.LAUNCHED;

            emit launched();
        }

    }

    function makeDonation(uint[] memory _partitions) public checkPartitions(_partitions) onlyLAUNCHED  payable {

        require(msg.value > 0, "The donated amount cannot be null!");

        makePartition(_partitions);

        donations[msg.sender].push(Donation(msg.value, _partitions));

    }

    function makePartition(uint[] memory _partitions) internal checkPartitions(_partitions) {

        for(uint i=0; i<beneficiaries.length; i++){
            amountXBeneficiary[beneficiaries[i]] = amountXBeneficiary[beneficiaries[i]].add((msg.value.mul(_partitions[i])).div(100));
        }

        balance = balance.add(msg.value);

        checkMilestone();

        emit DonationMade(msg.sender);
    }

    function checkMilestone() internal {

        bool reached = false;

        for(uint i=0; i<milestones.length; i++){
            if(milestonesLedger[milestones[i]] == true){
                continue;
            }else{
                if(milestones[i] <= balance){
                    milestonesLedger[milestones[i]] = true;

                    currentDeadline ++;

                    emit MilestoneReached(milestones[i], msg.sender);

                    reached = true;
                }else{

                    break;

                }

            }
        }

        if(reached){
            uint prize = tpContract.withdrawPrize();

            uint amount = prize.div(beneficiaries.length);

            for(uint i=0; i<beneficiaries.length; i++){
                amountXBeneficiary[beneficiaries[i]] = amountXBeneficiary[beneficiaries[i]].add(amount);
            }
            uint total = amount.mul(beneficiaries.length);
            balance = balance.add(total);
            uint[] memory emptyPartitions = new uint[](1);
            donations[address(tpContract)].push(Donation(total, emptyPartitions));

        }
    }

    function withdraw() public onlyEXPIRED() checkBeneficiary(msg.sender) {

        require(amountXBeneficiary[msg.sender] > 0, "Re-entrancy check failed!");

        uint amount = amountXBeneficiary[msg.sender];
        balance = balance.sub(amount);
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

    function disableCampaign() public onlyOrganizers() onlyEXPIREDorBLOCKED() {
        require(balance == 0, "Some funds has not been withdrawn yet!");

        state = State.DISABLED;

        emit disabled();
    }

    function reportFraud() public payable {

        require(msg.value > 0, "You must invest some ether to report a fraud!");

        reports[msg.sender] = msg.value;
        reporters.push(msg.sender);
        reportersCount ++;

        for(uint i=0; i<beneficiaries.length; i++){
            amountXBeneficiary[beneficiaries[i]].add((msg.value).div(beneficiaries.length));
        }

        balance = balance.add(msg.value);

        emit CampaignReported();

        if(reportersCount > fraudThreshold){
            state = State.BLOCKED;

            emit blocked();
        }
    }

    function takeBackDonation() public onlyBLOCKED() {
        uint amount = 0;
        if(donations[msg.sender].length != 0){

            for(uint i=0; i< donations[msg.sender].length; i++){
                amount = amount.add(donations[msg.sender][i].amount);
                donations[msg.sender][i].amount = 0;
            }

        }
        if(reports[msg.sender] != 0){

            amount = amount.add(reports[msg.sender]);
            reports[msg.sender] = 0;

        }

        balance = balance.sub(amount);

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success == true, "Error while taking back the donations!");

        emit DonationTookBack(msg.sender);
    }

    receive() external payable {}

}