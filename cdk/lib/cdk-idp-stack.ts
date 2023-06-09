import { NestedStack, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';

export class CdkIdpStack extends NestedStack {
    public userPool: cognito.IUserPool
    public clientId: string
    public openidconnectUrl: string;

    constructor(scope: Construct, id: string, props: StackProps & { zone_name: string, dash_record_name: string, idp_prefix: string }) {
        super(scope, id, props);

        const fullDomain = `${props.zone_name}.${props.dash_record_name}`;

        this.userPool = new cognito.UserPool(this, `user-pool`, {
            userPoolName: `sample-demo-user-pool`,
            selfSignUpEnabled: true,
            signInCaseSensitive: false,
            signInAliases: { email: true },
            autoVerify: { email: true },
            email: cognito.UserPoolEmail.withCognito('adimaria@tai.it'),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false
                }
            }
        });

        const readScope = new cognito.ResourceServerScope({ scopeName: 'read', scopeDescription: 'Read Access' });;
        const writeScope = new cognito.ResourceServerScope({ scopeName: 'write', scopeDescription: 'Write Access' });

        const appApiResourceServer = this.userPool.addResourceServer('cognito-app-api-rs', {
            identifier: 'app',
            userPoolResourceServerName: 'app-api',
            scopes: [readScope, writeScope],
        });


        const dashboardClient = this.userPool.addClient(`cognito-web-client`, {
            userPoolClientName: 'web-client',
            generateSecret: false,
            authFlows: {
                userPassword: true
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: true
                },
                scopes: [
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.resourceServer(appApiResourceServer, readScope),
                    cognito.OAuthScope.resourceServer(appApiResourceServer, writeScope)
                ],
                callbackUrls: [
                    `https://${fullDomain}`,
                    `https://${fullDomain}/login`,
                    `http://localhost:4200`,
                    `http://localhost:4200/login`,
                    `https://editor.swagger.io/oauth2-redirect.html`,
                    `https://oauth.pstmn.io/v1/callback`
                ],
                logoutUrls: [
                    `https://${fullDomain}`,
                    `https://${fullDomain}/logout`,
                    `http://localhost:4200`,
                    `http://localhost:4200/logout`,
                    `https://editor.swagger.io/oauth2-redirect.html`,
                    `https://oauth.pstmn.io/v1/callback`
                ]
            },
            refreshTokenValidity: cdk.Duration.minutes(60 * 24),
            accessTokenValidity: cdk.Duration.minutes(60)
        });

        this.userPool.addDomain(`user-pool-domain`, {
            cognitoDomain: {
                domainPrefix: props.idp_prefix
            }
        })

        this.clientId = dashboardClient.userPoolClientId;
        this.openidconnectUrl = `https://cognito-idp.${props.env?.region}.amazonaws.com/${this.userPool.userPoolId}/.well-known/openid-configuration`;
        
        new cdk.CfnOutput(scope, `cognito-client-id`, { value: this.clientId })
        new cdk.CfnOutput(scope, `cognito-pool-id`, { value: this.userPool.userPoolId })
        new cdk.CfnOutput(scope, `cognito-endpoint`, { value: this.openidconnectUrl });
    }
}