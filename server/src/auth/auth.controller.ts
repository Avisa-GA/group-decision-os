import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IdentifyDto } from './dto/identify.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('identify')
  identify(@Body() dto: IdentifyDto) {
    return this.authService.identify(dto);
  }
}
