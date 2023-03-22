import { Stack, StackProps } from "aws-cdk-lib";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs";
import { CdkBackendStack } from "./cdk-backend-stack";
import { CdkFrontendStack } from "./cdk-frontend-stack";
import { CdkIdpStack } from "./cdk-idp-stack";

export interface CdkServerlessAppProps {
    lambda: lambda.Code;
    layer: lambda.Code;
    zone_name: string;
    record_name: string;
    certificate_arn: string;
    dash_record_name: string;
    idp_prefix: string;
}
export class CdkServerlessAppStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps & CdkServerlessAppProps) {
        super(scope, id, props);

        const idp = new CdkIdpStack(this, 'IdpStack', {
            stackName: 'demo-app-idp',
            ... props
        });
        new CdkBackendStack(this, 'BackendStack', {
            stackName: 'demo-app-backend',
            ... props,
            cognitoPool: idp.userPool,
            cognitoClientId: idp.clientId
        });
        new CdkFrontendStack(this, 'FrontendStack', {
            stackName: 'demo-app-frontend',
            ... props,
            cognitoPool: idp.userPool,
            cognitoClientId: idp.clientId,
            cognitoOpenIdConnectUrl: idp.openidconnectUrl
        });
    }
}