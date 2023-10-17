import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BitcoinService, EthereumService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [EthereumService, PrismaService, BitcoinService],
})
export class AppModule {}
