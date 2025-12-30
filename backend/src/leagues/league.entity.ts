import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Roster } from '../rosters/roster.entity';
import { Draft } from '../drafts/draft.entity';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  commissionerId: string; // User ID of league commissioner

  @Column({ default: 12 })
  maxTeams: number;

  @Column({ default: 0 })
  currentTeams: number;

  @Column({ default: 'draft' })
  status: 'draft' | 'active' | 'completed';

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    scoring: {
      goals: number;
      assists: number;
      shots: number;
      hits: number;
      blocks: number;
      pim: number;
      plusMinus: number;
    };
    rosterSize: {
      forwards: number;
      defensemen: number;
      goalies: number;
      bench: number;
    };
    activeLineup?: {
      forwards: number;
      defensemen: number;
      goalies: number;
    };
    weeklyLimits?: {
      maxGoalieStarts: number;
      maxAdds: number;
      maxDrops: number;
    };
    transactionDeadline?: string;
    lineupDeadline?: string;
    irSpots?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Roster, (roster) => roster.league)
  rosters: Roster[];

  @OneToMany(() => Draft, (draft) => draft.league)
  drafts: Draft[];
}

