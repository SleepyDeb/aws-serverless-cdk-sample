import { NgModule } from '@angular/core';
import { AuthModule } from 'angular-auth-oidc-client';
import { OpenIdConfiguration } from '../auth.config';


@NgModule({
    imports: [AuthModule.forRoot({
        config: OpenIdConfiguration
      })],
    exports: [ AuthModule ],
})
export class AuthConfigModule {}
