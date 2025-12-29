import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { Draft } from './draft.entity';
import { DraftPick } from './draft-pick.entity';
import { Roster } from '../rosters/roster.entity';
import { League } from '../leagues/league.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Draft, DraftPick, Roster, League])],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}

