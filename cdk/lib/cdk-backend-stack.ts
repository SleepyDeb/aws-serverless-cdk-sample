import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as r53t from 'aws-cdk-lib/aws-route53-targets';

export interface CdkStackProps {
  lambda: lambda.Code;
  layer: lambda.Code;
  zone_name: string;
  record_name: string;
  certificate_arn: string;
}

export class CdkBackendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & CdkStackProps) {
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

    const certificate = acm.Certificate.fromCertificateArn(this, `acm-certificate`, props.certificate_arn);
    const api = new apigw.RestApi(this, 'orders-api', {
      domainName: {
        domainName: `${props.record_name}.${props.zone_name}`,
        certificate
      }
    });
    
    const zone = r53.HostedZone.fromLookup(this, `hosted-zone`, {
      domainName: props.zone_name
    });

    new r53.ARecord(this, `apigw-dns-record`, {
      zone,
      recordName: props.record_name,
      target: r53.RecordTarget.fromAlias(new r53t.ApiGateway(api))
    });
    
    const orders = api.root.addResource('orders');
    orders.addMethod('POST', new apigw.LambdaIntegration(postOrderLambda));
    orders.addMethod('GET', new apigw.LambdaIntegration(listOrderLambda));

    const ordersOrderId = orders.addResource("{orderId}");
    ordersOrderId.addMethod("GET", new apigw.LambdaIntegration(getOrderLambda));
  }
}
