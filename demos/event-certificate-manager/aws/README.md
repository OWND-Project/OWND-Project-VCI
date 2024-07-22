# VCI CloudFormation Template

This repository contains an AWS CloudFormation template for deploying the Virtual Corporate Infrastructure (VCI).

## Template Overview

This template deploys the following resources:

- VPC, subnets, and network resources
- Internet Gateway and its attachment
- Security Groups
- EC2 instances
- Application Load Balancer (ALB) with listeners and target groups
- Route53 Alias Records
- CodeStar Connections, S3 bucket, CodePipeline, and CodeDeploy resources

## Parameters

| Parameter Name   | Description                  | Required | Default Value   |
| ---------------- | ---------------------------- | -------- | --------------- |
| `Domain`         | Domain for VCI               | Yes      | None            |
| `VCISubdomain`   | Subdomain for VCI            | Yes      | None            |
| `HostedZoneID`   | HostedZoneID for Route53     | Yes      | None            |
| `ACMARN`         | ACM for VCI (Optional)       | No       | Empty String    |

**Note**: All parameters except `ACMARN` are required.

## Usage

### Prerequisites

1. Install and configure the AWS CLI.
2. Download the CloudFormation template file or clone the repository.

### Deploying from the Command Line

Use specific AWS CLI commands to create, update, and delete the CloudFormation stack. Here are examples:

1. Create the stack
2. Update the stack
3. Delete the stack

### Deploying from the AWS Console

You can also deploy the CloudFormation template using the AWS Console.

1. Log in to the AWS Management Console and navigate to the CloudFormation service.
2. Click "Create stack" and select "With new resources (standard)".
3. Select "Template is ready" and then "Upload a template file".
4. Choose the downloaded CloudFormation template file from your local file system.
5. Click "Next", enter the stack name (Event Name), and fill in the required parameters. `ACMARN` is optional.
6. Configure any additional settings as needed and click "Next".
7. Review the stack settings and click "Create stack".

For detailed instructions, refer to the [AWS CloudFormation Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html).

## Deploying Frontend and Backend

### Automated Deployment of Frontend (react-admin)

To automatically deploy the frontend, set up AWS Amplify. Refer to the official documentation for setup instructions.

1. Go to the AWS Amplify Console.
2. Create a new app and connect your repository.
3. Configure the necessary build settings and environment variables.
4. Start the deployment.

For more detailed steps, see the [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/).

### Automated Deployment of Backend (Node.js)

To automatically deploy the backend, you need to set up AWS CodeDeploy manually. Here is an overview of the steps:

1. Go to the AWS CodeDeploy Console and create a new application.
2. Create a deployment group and select the EC2 instances created as the target.
3. Configure the deployment settings (deployment timing, post-deployment validation, etc.).
4. Use CodePipeline to create a pipeline that deploys to the CodeDeploy application.

For more detailed steps, see the [AWS CodeDeploy Documentation](https://docs.aws.amazon.com/codedeploy/).

## Notes

- Be sure to use the event name as the stack name.
- Ensure all required parameters are correctly set before deploying.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
