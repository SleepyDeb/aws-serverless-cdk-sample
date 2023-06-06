import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OAuthModule } from 'angular-oauth2-oidc';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthConfigModule } from './auth/auth-config.module';
import { Router } from '@angular/router';
import { AuthInterceptor, OidcSecurityService } from 'angular-auth-oidc-client';
import { JsonDateInterceptor } from './interceptors/json-date.interceptor';
import { initAuthFactory, AuthService } from './services/auth.service';
import { OrdersComponent } from './orders/orders.component';
import { BasePathInterceptor } from './interceptors/base-path.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    OrdersComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AuthConfigModule,
    OAuthModule.forRoot()
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JsonDateInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: BasePathInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuthFactory,
      deps: [ OidcSecurityService, AuthService, Router ],
      multi: true
     }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
