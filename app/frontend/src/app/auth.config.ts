import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from 'src/environments/environment';

export const authCodeFlowConfig: AuthConfig = {
  issuer: environment.openidconnectEndpoint.split('/.well')[0],
  redirectUri: window.location.origin + '/index.html',
  strictDiscoveryDocumentValidation: false,
  clientId: environment.clientId,
  responseType: 'code',
  scope: 'openid profile email app/read app/write',
  showDebugInformation: true,
  timeoutFactor: 0.01,
  checkOrigin: false,
};