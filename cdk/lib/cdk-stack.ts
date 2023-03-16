import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export interface CdkStackProps {
  lambda: lambda.Code;
  layer: lambda.Code;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps & CdkStackProps) {
    super(scope, id, props);

    const ordersTable = new dynamo.Table(this, `orders-table`, {
      tableName: `sample-orders-table`,
      partitionKey: {
        name: 'id',
        type: dynamo.AttributeType.STRING
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    const basicLambdaLayer = new lambda.LayerVersion(this, `NodeModulesDepsLayer`, {
      compatibleRuntimes: [ lambda.Runtime.NODEJS_18_X ],
      code: props!.layer
    })

    const postOrderLambda = new lambda.Function(this, "PostOrderLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: props!.lambda,
      handler: "handlers.postOrder",
      layers: [ basicLambdaLayer ],
      description: new Date().toString(),
      environment: {
        ORDERS_TABLE_NAME: ordersTable.tableName
      }
    });
    ordersTable.grantWriteData(postOrderLambda);

    const listOrderLambda = new lambda.Function(this, "ListOrderLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: props!.lambda,
      handler: "handlers.listOrders",
      layers: [ basicLambdaLayer ],
      description: new Date().toString(),
      environment: {
        ORDERS_TABLE_NAME: ordersTable.tableName
      }
    });
    ordersTable.grantReadData(listOrderLambda);


    const getOrderLambda = new lambda.Function(this, "GetOrderLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: props!.lambda,
      handler: "handlers.getOrder",
      layers: [ basicLambdaLayer ],
      description: new Date().toString(),
      environment: {
        ORDERS_TABLE_NAME: ordersTable.tableName
      }
    });
    ordersTable.grantReadData(getOrderLambda);

    const api = new apigw.RestApi(this, 'orders-api');

    const orders = api.root.addResource('orders');
    orders.addMethod('POST', new apigw.LambdaIntegration(postOrderLambda));
    orders.addMethod('GET', new apigw.LambdaIntegration(listOrderLambda));

    orders.addResource("{orderId}").addMethod("GET", new apigw.LambdaIntegration(getOrderLambda))
  }
}
