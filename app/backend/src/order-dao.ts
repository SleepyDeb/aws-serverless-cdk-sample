import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
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

export async function putOrder(order: OrderModel) {
    order.id = crypto.randomUUID();
    await dynamoClient.send(new PutCommand({
        TableName,
        Item: order
    }));
}