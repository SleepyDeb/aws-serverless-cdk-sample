import { HttpClient } from "@angular/common/http";
import { Injectable, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import * as rxjs from "rxjs";
import { OpenIdConfiguration } from "../auth.config";

export function initAuthFactory(oidc: OidcSecurityService, auth: AuthService, router: Router) {
    console.info(`initializing....`);
    return ()=> {
        return oidc.checkAuth().pipe(rxjs.tap((authStatus)=>{
            console.info(`Status: ${JSON.stringify(authStatus)}`);
            if(authStatus.isAuthenticated && authStatus.userData) {
                auth.IsLogged = authStatus.isAuthenticated;
                auth.Username = authStatus.userData.username;
            }
            else {
                auth.Login();
            }
        }))
    }
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnInit {
    private _isAuthenticated = false;
    private _username = '';

    public get IsLogged() {
        return this._isAuthenticated;
    }

    public set IsLogged(value: boolean) {
        this._isAuthenticated = value;
    }

    public get Username() {
        return this._username;
    }

    public set Username(value: string) {
        this._username = value;
    }

    constructor(public oidc: OidcSecurityService, private httpClient: HttpClient) {

    }

    ngOnInit(): void {
        this.oidc.userData$.subscribe((userData)=>{
            console.info(`New userdata: ${JSON.stringify(userData)}`);
        })

        this.oidc.isAuthenticated$.subscribe((authStatus)=>{
            console.info(`Is Authenticated: ${authStatus.isAuthenticated}`);
            this._isAuthenticated = authStatus.isAuthenticated;
        });
    }

    public Login() {
        this.oidc.authorize();
    }

    public Logout() {
        const cognitoStatus = JSON.parse(sessionStorage.getItem("cognito") ?? '{}').authWellKnownEndPoints.authorizationEndpoint as string;
        const baseOAuthEndpoint = cognitoStatus.substring(0, cognitoStatus.lastIndexOf('/oauth2'));
        const logoutEndpoint = `${baseOAuthEndpoint}/logout`;
        const logoutUri = `${window.location.origin}/logout`;
        const clientId = OpenIdConfiguration.clientId!;
        sessionStorage.clear();
        window.location.href = `${logoutEndpoint}?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutUri)}`;
    }
}
