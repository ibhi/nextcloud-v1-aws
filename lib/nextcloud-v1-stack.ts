import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as efs from '@aws-cdk/aws-efs';
import * as fs from 'fs';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';

export class NextcloudV1Stack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keyName = 'nextcloud-aws-keypair';

    const secretArn = secretsmanager.Secret.fromSecretArn(
      this, 
      'NextcloudSecret',
      'arn:aws:secretsmanager:eu-west-3:782677160809:secret:prod/nextcloud/secrets-S6cRK1'
    ).secretArn;

    const hostedZoneId = 'ZVX61BHCX8GQS';
    const domain = 'ibhi.info';

    const vpc = new ec2.Vpc(this, 'Nextcloud-VPC', {
      // gatewayEndpoints: {
      //   S3: {
      //     service: ec2.GatewayVpcEndpointAwsService.S3
      //   }
      // },
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        }
      ]
    });

    const securityGroup = new ec2.SecurityGroup(this, 'Nextcloud-SecurityGroup', {
      vpc,
      description: 'Security group to allow ingress http and https',
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'For ssh');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'For http');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'For https');

    // Spotfleet

    const spotFleetRole = new iam.Role(this, 'NextcloudSpotFleetRole', {
      assumedBy: new iam.ServicePrincipal('spotfleet.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          'NextcloudAmazonEC2SpotFleetTaggingRole',
          'arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole')
      ],
      path: '/'
    });

    const cloudwatchLogsGroup = new logs.LogGroup(this, 'NextcloudCloudwatchLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK
    });

    const bucket = new s3.Bucket(this, 'NextcloudBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const spotFleetInstanceRole = new iam.Role(this, 'NextcloudSpotFleetInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams'
      ],
      resources: ['arn:aws:logs:*:*:*']
    }));

    spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue'
      ],
      resources: [secretArn]
    }));

    spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:DescribeAddresses',
        'ec2:AllocateAddress',
        'ec2:DescribeInstances',
        'ec2:AssociateAddress'
      ],
      resources: ['*']
    }));

    spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:Get*',
        's3:Put*',
        's3:Delete*',
        's3:ListBucket',
        's3:ListBucketVersions'
      ],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects('*')
      ]
    }));

    spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:ListBuckets'],
      resources: ['arn:aws:s3:::*']
    }));

    // Temporary policy to upload the amazon-cloud-watch-log-agent config file to AWS Systems Manager
    // spotFleetInstanceRole.addToPolicy(new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: [
    //     'ssm:PutParameter'
    //   ],
    //   resources: [
    //     'arn:aws:ssm:*:*:parameter/AmazonCloudWatch-*'
    //   ]
    // }));

    spotFleetInstanceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));

    const spotFleetInstanceProfile = new iam.CfnInstanceProfile(this, 'NextcloudSpotFleetInstanceProfile', {
      roles: [spotFleetInstanceRole.roleName],
      path: '/'
    });

    const elasticIp = new ec2.CfnEIP(this, 'NextcloudElasticIp');

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'NextcloudHostedZone',
      {
        hostedZoneId: hostedZoneId,
        zoneName: domain
      }
    );
    // const hostedZone = new route53.HostedZone(this, 'NextcloudHostedZone', {
    //   zoneName: domain
    // });

    new route53.ARecord(this, 'NextcloudARecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromIpAddresses(elasticIp.ref),
      recordName: `nextcloud.${domain}`
    });

    // const mountTargetSecurityGroup = new ec2.SecurityGroup(this, 'NextcloudMountTargetSG', {
    //   vpc
    // });
    // mountTargetSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(2049), 'EFS ingress rule');

    // const efsFileSystem = new efs.EfsFileSystem(this, 'NextcloudEfsFileSystem', {
    //   vpc,
    //   encrypted: true,
    //   performanceMode: efs.EfsPerformanceMode.GENERAL_PURPOSE,
    //   lifecyclePolicy: efs.EfsLifecyclePolicyProperty.AFTER_30_DAYS,
    //   securityGroup: mountTargetSecurityGroup,
    // });

    
    const userData = fs.readFileSync(process.cwd() + '/src/init.sh').toString('utf-8');

    const appUserData = ec2.UserData.forLinux();

    appUserData.addCommands(userData);

    appUserData.addCommands(
      `sudo su - ec2-user`,
      `export EC2_INSTANCE_ID=\`wget -q -O - http://169.254.169.254/latest/meta-data/instance-id || die "wget instance-id has failed: $?"\``,
      `export ALLOCATION_ID=${elasticIp.attrAllocationId}`,
      `echo $ALLOCATION_ID`,
      `mkdir -p /data/app`,
      `sudo chown -R ec2-user:ec2-user /data/app`,
      `cd /data/app`,
      `git clone https://github.com/ibhi/nextcloud-v1-aws.git`,
      `cd /data/app/nextcloud-v1-aws`,
      `npm install`,
      `sudo chown -R ec2-user:ec2-user /data/app/nextcloud-v1-aws`,
      `node /data/app/nextcloud-v1-aws/src/elastic-ip.js`,
      `node /data/app/nextcloud-v1-aws/src/get-secrets.js`,
      `sudo chown -R ec2-user:ec2-user /data`,
      `chmod +x /data/app/nextcloud-v1-aws/src/secrets.sh`,
      `./data/app/nextcloud-v1-aws/src/secrets.sh`,
      `source /data/app/nextcloud-v1-aws/src/secrets.sh`,
      `cd /data/app/nextcloud-v1-aws/src`,
      `docker network create frontend`,
      `export DOMAIN=${domain}`,
      `docker-compose up -d`,
    );

    const createSpotFleetLaunchSpecifications: (instanceType: string) => ec2.CfnSpotFleet.SpotFleetLaunchSpecificationProperty = (instanceType: string) => ({
      iamInstanceProfile: {
        arn: spotFleetInstanceProfile.attrArn
      },
      imageId: new ec2.AmazonLinuxImage().getImage(this).imageId,
      instanceType: instanceType,
      keyName: keyName,
      securityGroups: [
        {
          groupId: securityGroup.securityGroupId
        }
      ],
      blockDeviceMappings: [{
        deviceName: '/dev/sdk',
        ebs: {
          // snapshotId: '',
          encrypted: true,
          volumeSize: 5,
          volumeType: 'gp2',
          deleteOnTermination: false
        }
      }],
      subnetId: (() => vpc.publicSubnets.map(subnet => subnet.subnetId).join(','))(),
      monitoring: { enabled: true },
      userData: cdk.Fn.base64(appUserData.render())
    });

    const spotfleet = new ec2.CfnSpotFleet(this, 'Nextcloud-Spotfleet', {
      spotFleetRequestConfigData: {
        allocationStrategy: 'lowestPrice',
        type: 'maintain',
        iamFleetRole: spotFleetRole.roleArn,
        targetCapacity: 1,
        terminateInstancesWithExpiration: true,
        instanceInterruptionBehavior: 'stop',
        launchSpecifications: [
          createSpotFleetLaunchSpecifications('t3a.small'),
          createSpotFleetLaunchSpecifications('t3.small'),
          createSpotFleetLaunchSpecifications('t2.small'),
        ]
      }
    })

  }
}
