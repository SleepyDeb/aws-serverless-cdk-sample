import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as fs from 'fs';

const lambdaCodeDirectory = path.resolve(__dirname, '../../', 'app/backend/dist');
const lambdaCodeAsset = lambda.Code.fromAsset(lambdaCodeDirectory);

if(!fs.existsSync(lambdaCodeDirectory))
  throw new Error(`Please build the code directory with 'npm run build' first (${lambdaCodeDirectory})`);

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

    const putOrderHandler = new lambda.Function(this, "PutOrderLambda", {
      runtime: lambda.Runtime.NODEJS_14_X, // So we can use async in widget.js
      code: lambdaCodeAsset,
      handler: "handlers.putOrder",
      environment: {
        ORDERS_TABLE_NAME: ordersTable.tableName
      }
    });

    ordersTable.grantWriteData(putOrderHandler);
  }
}
