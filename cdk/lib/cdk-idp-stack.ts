import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CdkStackProps } from "./cdk-backend-stack";

export class CdkIdpStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps & CdkStackProps) {
        super();
    }

    
}