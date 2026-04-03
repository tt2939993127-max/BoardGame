import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { AiRepoWorkbenchService } from './ai-repo-workbench.service';
import { FocusWorkbenchWorktreeDto } from './dtos/focus-worktree.dto';
import { RegisterWorkbenchWorktreeDto } from './dtos/register-worktree.dto';
import { StartNewFactionRunDto } from './dtos/start-new-faction-run.dto';
import { SubmitRuleSourceDecisionDto } from './dtos/submit-rule-source-decision.dto';

@Controller('devtools/ai-repo-workbench')
export class AiRepoWorkbenchController {
    constructor(@Inject(AiRepoWorkbenchService) private readonly workbenchService: AiRepoWorkbenchService) {}

    @Get('journal')
    async getJournal() {
        return this.workbenchService.getJournal();
    }

    @Post('journal/query')
    async queryJournal() {
        return this.workbenchService.getJournal();
    }

    @Post('reset')
    async resetJournal() {
        return this.workbenchService.resetJournal();
    }

    @Post('worktrees/register')
    async registerWorktree(@Body() body: RegisterWorkbenchWorktreeDto) {
        return this.workbenchService.registerWorktree(body);
    }

    @Post('worktrees/focus')
    async focusWorktree(@Body() body: FocusWorkbenchWorktreeDto) {
        return this.workbenchService.focusWorktree(body.worktreeId);
    }

    @Post('runs/start-new-faction')
    async startNewFaction(@Body() body: StartNewFactionRunDto) {
        return this.workbenchService.startNewFaction({
            factionName: body.factionName,
            nodeToggles: body.nodeToggles as Partial<Record<'run-e2e-validation', boolean>> | undefined,
        });
    }

    @Post('decisions/submit-rule-source')
    async submitRuleSourceDecision(@Body() body: SubmitRuleSourceDecisionDto) {
        return this.workbenchService.submitRuleSourceDecision(body);
    }

    @Post('runs/advance')
    async advance() {
        return this.workbenchService.advance();
    }
}
