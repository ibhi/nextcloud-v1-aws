sudo yum update -y 
sudo yum install -y gcc-c++ make

# Install collectd
sudo yum install collectd -y

# Install git
sudo yum install git -y

# Cloud watch agent setup
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-linux -s

# Install nodejs
curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
sudo yum install -y nodejs
# Install and start docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.25.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo mv /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo chmod +x /usr/bin/docker-compose

# Install EFS utils and mount efs
sudo yum install -y amazon-efs-utils
# Todo
