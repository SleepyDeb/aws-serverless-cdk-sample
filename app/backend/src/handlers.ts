import { APIGatewayProxyEventV2, Context } from "aws-lambda";

// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
export async function putOrder(event: APIGatewayProxyEventV2, context: Context) {
    return {
        statusCode: '200',
        body: JSON.stringify({})
    }
}