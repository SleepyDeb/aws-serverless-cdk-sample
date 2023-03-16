import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as fs from 'fs';
import * as fsex from 'fs-extra';

const lambdaCodeDirectory = path.resolve(__dirname, '../../', 'app/backend/dist/src');
const lambdaCodeAsset = lambda.Code.fromAsset(lambdaCodeDirectory);
if(!fs.existsSync(lambdaCodeDirectory))
  throw new Error(`Please build the code directory with 'npm run build' first (${lambdaCodeDirectory})`);
  
const lambdaNodeModulesDirectory = path.resolve(__dirname, '../../', 'app/backend/node_modules/');
const lambdaNodeModulesDirectoryDestination = path.resolve(__dirname, '../../', 'app/backend/layer/nodejs/node_modules/');
const lambdaNodeModulesDirectoryLayerDirectory = path.resolve(__dirname, '../../', 'app/backend/layer/');
fsex.copySync(lambdaNodeModulesDirectory, lambdaNodeModulesDirectoryDestination, { overwrite: true });
const lambdaLayerAsset = lambda.Code.fromAsset(lambdaNodeModulesDirectoryLayerDirectory);

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const ordersTable = new dynamo.Table(this, `orders-table`, {
      tableName: `sample-orders-table`,
      partitionKey: {
        name: 'id',
        type: dynamo.AttributeType.STRING
      }
    });

    const basicLambdaLayer = new lambda.LayerVersion(this, `NodeModulesDepsLayer`, {
      compatibleRuntimes: [ lambda.Runtime.NODEJS_18_X ],
      code: lambdaLayerAsset
    })

    const putOrderHandler = new lambda.Function(this, "PutOrderLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambdaCodeAsset,
      handler: "handlers.putOrder",
      layers: [ basicLambdaLayer ],
      environment: {
        ORDERS_TABLE_NAME: ordersTable.tableName
      }
    });

    ordersTable.grantWriteData(putOrderHandler);
  }
}
