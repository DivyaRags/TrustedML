pragma solidity ^0.4.25;

contract Message {
    string public message;

    function Message(string memory initialMessage) public {
        message = initialMessage;
    }
    
     function setMessage(string memory newMessage) public{
        message = newMessage;
    }
}