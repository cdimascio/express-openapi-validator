import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import * as OpenApiValidator from 'express-openapi-validator';
import { join } from 'path';
import { PingModule } from './modules/ping/ping.module';
import { OpenApiExceptionFilter } from './filters/openapi-exception.filter';

@Module({
  imports: [PingModule],
  providers: [{ provide: APP_FILTER, useClass: OpenApiExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        ...OpenApiValidator.middleware({
          apiSpec: join(__dirname, './api.yaml'),
          validateRequests: {
            allowUnknownQueryParameters: true,
            coerceTypes: false,
          },
          validateResponses: true,
          validateFormats: 'full',
        }),
      )
      .forRoutes('*');
  }
}
