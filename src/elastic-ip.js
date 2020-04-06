// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/

// Load the AWS SDK
const AWS = require('aws-sdk'),
    region = "eu-west-3";

AWS.config.update({region: region});

const ec2 = new AWS.EC2();

AWS.config.logger = console;

console.log(`Allocation Id: ${process.env.ALLOCATION_ID} `);
console.log(`Instance Id: ${process.env.EC2_INSTANCE_ID}`);

var params = {
    AllocationId: process.env.ALLOCATION_ID,
    InstanceId: process.env.EC2_INSTANCE_ID
};

ec2.associateAddress(params, function (err, data) {
    if (err) throw err; // an error occurred
    else console.log('Associated Elastic Ip: ', data);           // successful response
    /*
    data = {
     AssociationId: "eipassoc-2bebb745"
    }
    */
});