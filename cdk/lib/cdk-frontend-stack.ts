import { NestedStack, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CdkStackProps } from "./cdk-backend-stack";
import * as cdk from 'aws-cdk-lib';

export class CdkFrontendStack extends NestedStack {
    constructor(scope: Construct, id: string, props: StackProps & CdkStackProps) {
        super(scope, id, props);
        
        const zoneName = props.zone_name;
        const zone = cdk.aws_route53.HostedZone.fromLookup(this, `route53-hosted-zone`, {
            domainName: zoneName
        });
        
        const recordName = props.dash_record_name;
        const fullDomainName = `${recordName}.${zoneName}`;

        // Create TLS certificate + automatic DNS validation
        const certificateArn = new cdk.aws_certificatemanager.DnsValidatedCertificate(this, `cloudfront-cert`, {
            domainName: fullDomainName,
            hostedZone: zone,
            region: 'us-east-1', // Cloudfront only checks this region for certificates.
            subjectAlternativeNames: [ fullDomainName, zoneName ]
        }).certificateArn;
        
        const bucket = new cdk.aws_s3.Bucket(this, `frontend-bucket`, {
            bucketName: `${props.stackName}-bucket`
        });

        const cloudfrontOAI = new cdk.aws_cloudfront.OriginAccessIdentity(this, `cloudfront-oai`, {
            comment: `OAI for ${id}`
        });

        // Grant access to cloudfront
        bucket.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
            actions: [ 's3:GetObject' ],
            resources: [bucket.arnForObjects('*')],
            principals: [new cdk.aws_iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
        }));

        const viewerCertificate = cdk.aws_cloudfront.ViewerCertificate.fromAcmCertificate({
            certificateArn: certificateArn,
            env: {
                region: props.env?.region!,
                account: props.env?.account!
            },
            node: this.node,
            stack: this,
            metricDaysToExpiry: () =>
                new cdk.aws_cloudwatch.Metric({
                    namespace: 'TLS Viewer Certificate Validity',
                    metricName: 'TLS Viewer Certificate Expired',
                }),
            applyRemovalPolicy: (policy: cdk.RemovalPolicy) => { }
        },
        {
            sslMethod: cdk.aws_cloudfront.SSLMethod.SNI,
            securityPolicy: cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            aliases: [ zoneName, fullDomainName ]
        })

        const distribution = new cdk.aws_cloudfront.CloudFrontWebDistribution(this, `web-cfwd`, {
            viewerCertificate,
            errorConfigurations: [ {
                errorCode: 403,
                responseCode: 200,
                responsePagePath: '/index.html'
            }],
            originConfigs: [ {
                s3OriginSource: {
                    s3BucketSource: bucket,
                    originAccessIdentity: cloudfrontOAI,
                    originPath: '/demo-spa'
                },
                behaviors: [{
                    isDefaultBehavior: true,
                    compress: true,
                    allowedMethods: cdk.aws_cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                }],
        }]});

        const target = cdk.aws_route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.CloudFrontTarget(distribution));

        // Set up Route53 aliases records for the CloudFront distribution
        new cdk.aws_route53.ARecord(this, `spa-dns`, { recordName, target, zone });
        new cdk.aws_route53.AaaaRecord(this, `spa-dns-ipv6`,  { recordName, target, zone });

        const branchOrRef = 'develop';
        const repository = new cdk.aws_codecommit.Repository(this, `frontend-repo`, {
            repositoryName: `${props.stackName}-repo`
        });

        const role = new cdk.aws_iam.Role(this, `spa-pipeline-role`, {
            roleName: `${props.stackName}-spa-pipeline-role`,
            assumedBy: new cdk.aws_iam.CompositePrincipal(
                new cdk.aws_iam.ServicePrincipal('codebuild.amazonaws.com'),
                new cdk.aws_iam.ServicePrincipal('codepipeline.amazonaws.com')
            ),
            managedPolicies: [
                cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName("ReadOnlyAccess")
            ],
            inlinePolicies: {
                "codebuild": new cdk.aws_iam.PolicyDocument({
                    statements: [
                        new cdk.aws_iam.PolicyStatement({
                            actions: [
                                "logs:CreateLogGroup",
                                "logs:CreateLogStream",
                                "logs:PutLogEvents"
                            ],
                            resources: ["*"],
                            effect: cdk.aws_iam.Effect.ALLOW
                        }),
                        new cdk.aws_iam.PolicyStatement({
                            actions: [
                                "codebuild:BatchPutCodeCoverages",
                                "codebuild:BatchPutTestCases",
                                "codebuild:CreateReport",
                                "codebuild:CreateReportGroup",
                                "codebuild:UpdateReport"
                            ],
                            resources: ["*"],

                            effect: cdk.aws_iam.Effect.ALLOW
                        }),
                        new cdk.aws_iam.PolicyStatement({
                            actions: [
                                "s3:Abort*",
                                "s3:DeleteObject*",
                                "s3:GetBucket*",
                                "s3:GetObject*",
                                "s3:List*",
                                "s3:PutObject",
                                "s3:PutObjectLegalHold",
                                "s3:PutObjectRetention",
                                "s3:PutObjectTagging",
                                "s3:PutObjectVersionTagging"
                            ],
                            resources: ["*"],
                            effect: cdk.aws_iam.Effect.ALLOW
                        })
                    ]
                }),
                "cloudfront": new cdk.aws_iam.PolicyDocument({
                    statements: [
                        new cdk.aws_iam.PolicyStatement({
                            actions: [
                                "cloudfront:CreateInvalidation"
                            ],
                            resources: ["*"],
                            effect: cdk.aws_iam.Effect.ALLOW
                        })
                    ]
                })
            }
        });

        // https://docs.aws.amazon.com/it_it/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
        const project = new cdk.aws_codebuild.Project(this, 'web-codebuild', {
            projectName: `${props.stackName}-codebuild-project`,
            environment: { buildImage: cdk.aws_codebuild.LinuxBuildImage.AMAZON_LINUX_2_4 },
            role,
            buildSpec: cdk.aws_codebuild.BuildSpec.fromObjectToYaml({
                version: 0.2,
                phases: {
                    build: {
                        commands: [
                            // Add cognito variables
                            "cd app/frontend/",
                            "npm install",
                            "npx ng build --configuration=production"
                        ]
                    },
                    post_build: {
                        commands: [
                            `aws s3 rm --recursive s3://${bucket.bucketName}/`,
                            `aws s3 cp --recursive ./dist/demo-spa/ s3://${bucket.bucketName}/demo-spa/`,
                            `aws cloudfront create-invalidation --distribution-id ${distribution.distributionId} --paths "/*"`
                        ]
                    }
                }
            }),
            source: cdk.aws_codebuild.Source.codeCommit({ repository, branchOrRef, fetchSubmodules: true }),
            cache: cdk.aws_codebuild.Cache.local(cdk.aws_codebuild.LocalCacheMode.SOURCE)
        });

        // TODO: Move everything into a Codepipeline and add the cloudfront invalidate call
        const onCommitRule = repository.onCommit('OnCommit', {
            target: new cdk.aws_events_targets.CodeBuildProject(project),
            branches: [ branchOrRef ]
        });
    }


}