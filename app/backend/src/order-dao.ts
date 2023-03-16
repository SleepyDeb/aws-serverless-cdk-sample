import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as crypto from 'crypto';

export interface OrderModel {
    id?: string;
    item: string;
    quantity: number;
};

const TableName = process.env.ORDERS_TABLE_NAME;
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true
    },
    unmarshallOptions: {
        wrapNumbers: false
    }
});

export async function createOrder(order: OrderModel) {
    order.id = crypto.randomUUID();
    await docClient.send(new PutCommand({
        TableName,
        Item: order
    }));

    return order;
}

export async function getOrder(orderId: string) {
    const response = await docClient.send(new GetCommand({
        TableName,
        Key: { id: orderId }
    }));

    return response.Item!;
}


export async function listOrders() {
    const response = await docClient.send(new ScanCommand({
        TableName
    }));

    return response.Items;
}