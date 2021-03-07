import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

@Controller()
export class PingController {
  @Get('ping/:value')
  public ping(@Param('value') value: string) {
    return { pong: value };
  }

  @Post('ping')
  @HttpCode(HttpStatus.OK)
  public pingBody(@Body() body: { ping: string }) {
    return { pong: body.ping };
  }
}
