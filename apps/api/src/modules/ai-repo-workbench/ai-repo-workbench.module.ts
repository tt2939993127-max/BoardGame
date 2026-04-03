import { Module } from '@nestjs/common';
import { AiRepoWorkbenchController } from './ai-repo-workbench.controller';
import { AiRepoWorkbenchService } from './ai-repo-workbench.service';

@Module({
    controllers: [AiRepoWorkbenchController],
    providers: [AiRepoWorkbenchService],
})
export class AiRepoWorkbenchModule {}
