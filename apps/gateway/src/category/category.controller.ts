import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { timeout } from 'rxjs';
import { CreateCategoryDto } from 'src/event/dto/create-event.dto';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('categories')
@UseGuards(AccessTokenGuard)
export class CategoryController {
  constructor(@Inject('EVENT_SERVICE') private readonly client: ClientProxy) {}

  @Post()
  @Roles('admin', 'facilitator')
  @UseGuards(AccessTokenGuard, RolesGuard)
  create(@Body() dto: CreateCategoryDto) {
    return this.client.send('category.create', dto).pipe(timeout(5000));
  }

  @Get()
  findAll() {
    return this.client.send('category.find_all', {}).pipe(timeout(5000));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send('category.find_one', { id }).pipe(timeout(5000));
  }
}
