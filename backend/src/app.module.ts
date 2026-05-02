import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import path from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Microbe } from './microbes/microbe.entity';
import { MicrobesModule } from './microbes/microbes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Repo root `.env` then `backend/.env` so R2 keys can live at root while DB stays local.
      envFilePath: [
        path.join(process.cwd(), '..', '.env'),
        path.join(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5556')),
        username: config.get<string>('DB_USERNAME', 'zoa'),
        password: config.get<string>('DB_PASSWORD', 'zoa'),
        database: config.get<string>('DB_NAME', 'zoa_db'),
        entities: [Microbe],
        synchronize: config.get<string>('TYPEORM_SYNC', 'true') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
      }),
      inject: [ConfigService],
    }),
    MicrobesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
