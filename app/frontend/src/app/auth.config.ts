import { environment } from "../environments/environment";
import * as oidc from "angular-auth-oidc-client/lib/config/openid-configuration";

export const OpenIdConfiguration: oidc.OpenIdConfiguration = {
    configId: 'cognito', 
    authority: environment.openidconnectEndpoint.split('/.well')[0],
    authWellknownEndpointUrl: environment.openidconnectEndpoint,
    redirectUrl: window.location.origin,
    clientId: environment.clientId,
    scope: 'openid profile app/read app/write',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,    
    secureRoutes: [ `https://${environment.apiEndpoint}` ]
};