import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { timeout } from 'rxjs';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('events')
@UseGuards(AccessTokenGuard)
export class EventController {
  constructor(@Inject('EVENT_SERVICE') private readonly client: ClientProxy) {}

  @Post()
  @Roles('admin', 'facilitator')
  @UseGuards(AccessTokenGuard, RolesGuard)
  create(@Body() dto: CreateEventDto) {
    return this.client.send('event.create', dto).pipe(timeout(5000));
  }

  @Get()
  findAll() {
    return this.client.send('event.find_all', {}).pipe(timeout(5000));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send('event.find_one', { id }).pipe(timeout(5000));
  }
}
