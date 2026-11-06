import { Module } from '@nestjs/common';
import { MatriculasModule } from './modules/matriculas/matriculas.module';

@Module({
  imports: [MatriculasModule],
})
export class AppModule {}
