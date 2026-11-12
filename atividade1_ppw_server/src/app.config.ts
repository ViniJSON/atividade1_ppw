import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Actor-Id', 'X-Actor-Role'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
