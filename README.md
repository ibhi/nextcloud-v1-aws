# Nextcloud server on AWS

This is a pet project, which uses AWS CDK to deploy a nextcloud server in AWS with ec2 spot fleet instance with S3 as internal storage backend for nextcloud. This app deploys the whole stack needed, however there are few manual steps has to be done before deploying this stack to AWS.

# Disclaimer
**Some of the AWS resources available in this stack will be charged by AWS, be aware**

## Resources in this stack
* ec2 spot fleet instance - Nextcloud server as docker container with Traefik v2 as reverse proxy to Nextcloud
    * EBS block volume - This is where nextcloud docker volume will be mounted. All the application files related to nextcloud installation and configuration will be stored in this volume
* S3 bucket - Internal storage backend for nextcloud server
* VPC - A new VPC with two public subnets for ec2 spot fleet instance and 2 isolated subnets for RDS serverless Aurora database
* RDS Aurora serverless - This is the database which will be used for Nextcloud server. Because this is a serverless database, whenever there is no load for 15mins to the database, the database will be shutdown and will be back up when there is load
* Elastic IP
* Secrets Manager secrets
* Cloudwatch log group

# Project setup

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
