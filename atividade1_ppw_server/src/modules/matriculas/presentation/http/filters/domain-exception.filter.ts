import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let statusCode = 400;
    let label = 'Bad Request';
    if (error instanceof ForbiddenError) {
      statusCode = 403;
      label = 'Forbidden';
    } else if (error instanceof NotFoundError) {
      statusCode = 404;
      label = 'Not Found';
    } else if (error instanceof ConflictError) {
      statusCode = 409;
      label = 'Conflict';
    }

    response
      .status(statusCode)
      .json({ statusCode, error: label, message: error.message });
  }
}
