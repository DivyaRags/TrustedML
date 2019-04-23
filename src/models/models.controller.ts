import {Router} from 'express';
import * as solc from 'solc';
import * as Web3 from 'web3';

import {registrySchema} from '../repo/procModelData';

var util = require('util');
import fs = require('fs');

const models: Router = Router();
let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

const WebSocket = require('ws');
let mws;
const wss = new WebSocket.Server({port: 8090});
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
         console.log('testing');
    });
    ws.on('error', () => {});
    mws = ws;
});

let executionAccount = 0
web3.eth.filter("latest", function (error, result) {
    if (!error) {
        try {
            let info = web3.eth.getBlock(result);
            if (info.transactions.length > 0) {

                let toNotify = [];
                info.transactions.forEach(transactionHash => {
                    let transRec = web3.eth.getTransactionReceipt(transactionHash);
                    let tranInfo = { 'hash': transactionHash,
                                      'blockNumber': transRec.blockNumber,
                                      'gas': transRec.gasUsed,
                                      'cumulGas': transRec.cumulativeGasUsed }
                   toNotify.push(tranInfo)
                });
                if (toNotify.length > 0) {
                    toNotify.forEach(add => {
                        if (mws)
                            mws.send(JSON.stringify(add), function ack(error) {
                            });
                    });
                } else {
                    //// console.log("Nothing to notify");
                }
            }
        } catch(ex) {  }
    }
});

let message: any = undefined;

models.post('/message', (req, res) => {
    console.log('DEPLOYING MESSAGE CONTRACT ...');
    try {
        let input = {
            'Message': fs.readFileSync('./src/models/abstract/Message.sol', 'utf8')
        };
            
        console.log('=============================================');
        console.log("SOLIDITY CODE");
        console.log('=============================================');
        console.log(input['Message']);
        console.log('....................................................................');
    
        let output = solc.compile({sources: input}, 1);
        if (Object.keys(output.contracts).length === 0) {
            res.status(400).send('COMPILATION ERROR IN MESSAGE SMART CONTRACTS');
            console.log('');
            console.log(output.errors);
            console.log('----------------------------------------------------------------------------------------------');
            return;
        }

        console.log('MESSAGE CONTRACT COMPILED SUCCESSFULLY');           
        console.log('CREATING MESSAGE CONTRACT INSTANCE ... ');

        let ProcContract = web3.eth.contract(JSON.parse(output.contracts['Message:Message'].interface));
            ProcContract.new(
                {
                    from: web3.eth.accounts[executionAccount],
                    data: "0x" + output.contracts['Message:Message'].bytecode,
                    gas: 4700000
                },
                (err, contract) => {
                    if (err) {
                        console.log(`ERROR: Message instance creation failed`);
                        console.log('RESULT ', err);
                        res.status(403).send(err);
                    } else if (contract.address) {
                        registrySchema.create(
                            {
                                address: contract.address,
                                solidityCode: input['Message'],
                                abi: output.contracts['Message:Message'].interface,
                                bytecode: output.contracts['Message:Message'].bytecode,
                            },
                            (err, repoData) => {
                                if (err) {
                                    console.log('Error ', err);
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                                else {
                                    message = contract;
                                    let registryGas = web3.eth.getTransactionReceipt(contract.transactionHash).gasUsed;
                                    let idAsString = repoData._id.toString();
                                    console.log("Message Contract DEPLOYED and RUNNING at " + message.address.toString());
                                    console.log('GAS USED: ', registryGas);
                                    console.log('REPO ID: ', idAsString);
                                    res.status(200).send({ 'address': message.address.toString(), gas: registryGas, repoId: idAsString});
                                    console.log('----------------------------------------------------------------------------------------------');
                                }
                            })
                    }
                });
    } catch (e) {
        console.log("Error: ", e);
        console.log('----------------------------------------------------------------------------------------------');
        res.status(400).send(e);
    }
});

export default models;