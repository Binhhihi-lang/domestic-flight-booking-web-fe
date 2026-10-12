import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { routes } from './app.routes';
import { environment } from '@env/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // MockRegistry là stateful (nhớ các thao tác ghi) nên phải là singleton.
    MockRegistry,
    provideHttpClient(
      withInterceptors(
        // Thứ tự quan trọng: authInterceptor chạy trước để gắn token, rồi mới
        // tới mockInterceptor. Mock đứng sau nên vẫn thấy được header thật.
        environment.useMock ? [authInterceptor, mockInterceptor] : [authInterceptor],
      ),
    ),
  ],
};
