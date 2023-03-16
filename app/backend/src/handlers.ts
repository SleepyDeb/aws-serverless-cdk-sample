import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import * as orderDao from './order-dao';

// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
export async function postOrder(event: APIGatewayProxyEventV2, context: Context) {
    const requestBody = JSON.parse(event.body ?? '{}') as orderDao.OrderModel;    

    console.info(JSON.stringify(event));

    if(requestBody.item == null || requestBody.quantity < 0 || Number.isNaN(requestBody.quantity)) {
        return {
            statusCode: '400',
            body: JSON.stringify({ message: "Bad request payload" })
        }
    }

    const order = await orderDao.createOrder(requestBody);

    return {
        statusCode: '200',
        body: JSON.stringify(order)
    }
}

// GET orders/{orderId}
export async function getOrder(event: APIGatewayProxyEventV2, context: Context) {    
    const orderId = event.pathParameters!['orderId']!;
    console.info(JSON.stringify(event));    

    const order = await orderDao.getOrder(orderId);

    return {
        statusCode: '200',
        body: JSON.stringify(order)
    }
}

// GET orders
export async function listOrders(event: APIGatewayProxyEventV2, context: Context) {            
    const orders = await orderDao.listOrders();

    return {
        statusCode: '200',
        body: JSON.stringify(orders)
    }
}