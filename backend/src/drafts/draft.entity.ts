import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { League } from '../leagues/league.entity';
import { DraftPick } from './draft-pick.entity';

@Entity('drafts')
export class Draft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed';

  @Column({ type: 'int', default: 0 })
  currentPick: number;

  @Column({ type: 'uuid', nullable: true })
  currentTeamId: string; // Roster ID whose turn it is

  @Column({ type: 'int', default: 60 })
  pickTimeLimitSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  pickExpiresAt: Date;

  @ManyToOne(() => League, (league) => league.drafts)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @OneToMany(() => DraftPick, (pick) => pick.draft, { cascade: true })
  picks: DraftPick[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

