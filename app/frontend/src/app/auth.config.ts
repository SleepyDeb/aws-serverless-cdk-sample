import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from 'src/environments/environment';

export const authCodeFlowConfig: AuthConfig = {  
  issuer: environment.openidconnectIssuer,
  redirectUri: window.location.origin + '/index.html',
  clientId: environment.clientId,
  responseType: 'code',
  scope: 'openid profile email app/read app/write',
  showDebugInformation: true,
  timeoutFactor: 0.01,
  checkOrigin: false,
};