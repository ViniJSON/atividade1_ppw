import { TransitionContext, TransitionGuard } from '../types';

export abstract class BaseGuard implements TransitionGuard {
  abstract readonly nome: string;
  aplicaA(_ctx: TransitionContext): boolean {
    return true;
  }
  abstract verificar(ctx: TransitionContext): Promise<void>;
}
