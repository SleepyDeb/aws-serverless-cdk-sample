#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as fs from 'fs';
import * as fsex from 'fs-extra';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { CdkStack } from '../lib/cdk-stack';
import { exec } from 'child_process';

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

    process.chdir(oldCwd);

    return {
        lambda: lambdaCodeAsset,
        layer: lambdaLayerAsset
    }
}

export async function main() {
    const build = await createLambdaAndLayerAssets();
    const app = new cdk.App();
    new CdkStack(app, 'CdkStack', { 
        stackName: 'demo-app', 
        ... build
    });
}

setTimeout(main, NaN);