#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fsex from 'fs-extra';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3d from 'aws-cdk-lib/aws-s3-deployment';
import * as file from 'fs/promises';
import { exec } from 'child_process';
import * as nodeConfigProvider from "@aws-sdk/node-config-provider";
import * as configResolver from "@aws-sdk/config-resolver";
import * as sts from "@aws-sdk/client-sts";
import * as ec2 from "@aws-sdk/client-ec2";
import { CdkServerlessAppStack } from '../lib/cdk-serverless-app';

async function cmd_run(command: string) {
    return new Promise((resolve, reject)=>{
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(error);
            } else {
                console.warn(command + " " + stdout);
                resolve(stdout)
            }
        });
    })
}

export async function createLambdaAndLayerAssets() {

    const oldCwd = process.cwd();
    const backendSourceDir = path.resolve(__dirname, '../../', 'app/backend/');

    process.chdir(backendSourceDir);
    await cmd_run('npm install');
    await cmd_run('npm run build');

    const buildOutput = path.join(backendSourceDir, '/dist/src');
    const lambdaCodeAsset = lambda.Code.fromAsset(buildOutput);

    const lambdaLayerDir = path.join(backendSourceDir, '/dist/layer/');
    const nodeModulesDir = path.join(backendSourceDir, '/node_modules/');
    const nodeModulesDestinationDir = path.join(lambdaLayerDir, '/nodejs/node_modules/');

    fsex.copySync(nodeModulesDir, nodeModulesDestinationDir, { overwrite: true });
    const lambdaLayerAsset = lambda.Code.fromAsset(lambdaLayerDir);

    const frontendSourceDir = path.resolve(__dirname, '../../', 'app/frontend/');
    process.chdir(frontendSourceDir);
    await cmd_run('npm install');
    await cmd_run('npm run build -- --configuration=production');
    const angularDeployDir = path.join(frontendSourceDir, '/dist/');
    const angularLayerAsset = s3d.Source.asset(angularDeployDir);

    process.chdir(oldCwd);

    return {
        lambda: lambdaCodeAsset,
        layer: lambdaLayerAsset,
        angular: angularLayerAsset
    }
}

export async function loadConfiguration() {
    const configFilePath = path.resolve(__dirname, '../config.json');
    return JSON.parse((await file.readFile(configFilePath)).toString()) as {
        zone_name: string,
        record_name: string,
        certificate_arn: string,
        dash_record_name: string,
        idp_prefix: string
    };
}


export async function loadEnvironment() {
    const region = await nodeConfigProvider.loadConfig(configResolver.NODE_REGION_CONFIG_OPTIONS, configResolver.NODE_REGION_CONFIG_FILE_OPTIONS)();

    // I need to retrieve the current user from STS
    // NB: it would only work locally
    const stsClient = new sts.STSClient({ });
    const awsIdentity = await stsClient.send(new sts.GetCallerIdentityCommand({}));

    const account = awsIdentity.Account!;
    const userArn = awsIdentity.Arn!

    const ec2Client = new ec2.EC2Client({});
    const describedZones = await ec2Client.send(new ec2.DescribeAvailabilityZonesCommand({ }));
    const zones = describedZones.AvailabilityZones!.map(z => z.ZoneName!);
    const profile = process.env['AWS_PROFILE'];

    return {
        account,
        region,
        userArn,
        zones,
        profile
    }
}

export async function main() {
    const build = await createLambdaAndLayerAssets();
    const config = await loadConfiguration();
    const env = await loadEnvironment();
    const app = new cdk.App();
    new CdkServerlessAppStack(app, `demo-app-stack`, {
        stackName: `demo-app-stack`,
        env,
        ... build,
        ... config
    })
}

setTimeout(main, NaN);