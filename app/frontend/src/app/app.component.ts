import { Component } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'demo-spa';
  
  constructor(private oauthService: OAuthService) {
    
  }

  public get apiUrl() {
    return environment.apiEndpoint;
  }

  public get manifestUrl() {
    return environment.openidconnectEndpoint;
  }

  public get loggedIn() {
    return this.oauthService.hasValidAccessToken();
  }

  public login() {
    console.info("login");
    this.oauthService.tryLoginCodeFlow();
  }

  public logout() {
    this.oauthService.logOut();
  }

  get userName(): string {
    const claims = this.oauthService.getIdentityClaims();
    if (!claims) return '';
    return claims['given_name'];
  }

  get idToken(): string {
    return this.oauthService.getIdToken();
  }

  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  refresh() {
    this.oauthService.refreshToken();
  }
}
