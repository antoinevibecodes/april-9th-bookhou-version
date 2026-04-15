import { Module } from '@nestjs/common';
import { WaiversService } from './waivers.service';
import { WaiversController } from './waivers.controller';

@Module({
  controllers: [WaiversController],
  providers: [WaiversService],
  exports: [WaiversService],
})
export class WaiversModule {}
