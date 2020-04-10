// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/

// Load the AWS SDK
const AWS = require('aws-sdk'),
    region = "eu-west-3",
    secretName = "prod/nextcloud/secrets";

const fs = require('fs');

// Create a Secrets Manager client
const client = new AWS.SecretsManager({
    region: region
});

var secret;

const createFileContent = (secret) => {
    return `#!/bin/bash -xe
    export NEXTCLOUD_ADMIN_USER=${secret.nextcloud_admin_user}
    export NEXTCLOUD_ADMIN_PASSWORD=${secret.nextcloud_admin_password}
    export MYSQL_DATABASE=${secret.mysql_database}
    export MYSQL_USER=${secret.mysql_user}
    export MYSQL_PASSWORD=${secret.mysql_password}
    export MYSQL_ROOT_PASSWORD=${secret.mysql_root_password}
    `;
};

const filePath = '/data/app/nextcloud-v1-aws/src/secrets.sh';

// In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
// See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
// We rethrow the exception by default.

client.getSecretValue({SecretId: secretName}, function(err, data) {
    if (err) {
        if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
    }
    else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
            const decodedBinarySecret = data.SecretString;
            secret = JSON.parse(decodedBinarySecret);
            const fileContent = createFileContent(secret);
            fs.writeFile(filePath, fileContent, (err) => {
                if (err) throw err;
                console.log(`${filePath} file successfully created`);
            });
        } else {
            const buff = new Buffer(data.SecretBinary, 'base64');
            const decodedBinarySecret = buff.toString('ascii');
            secret = JSON.parse(decodedBinarySecret);
            const fileContent = createFileContent(secret);
            fs.writeFile(filePath, fileContent, (err) => {
                if (err) throw err;
                console.log(`${filePath} file successfully created`);
            });
        }
    }
    
    // Your code goes here. 
});