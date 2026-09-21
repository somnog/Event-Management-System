import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  controllers: [CategoryController],
  providers: [],
})
export class CategoryModule {}
