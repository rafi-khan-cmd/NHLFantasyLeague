import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { League } from '../leagues/league.entity';
import { Roster } from '../rosters/roster.entity';

@Entity('matchups')
@Index(['leagueId', 'week', 'season'], { unique: false })
export class Matchup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column()
  week: number; // Week number in the season (1, 2, 3, etc.)

  @Column()
  season: string; // e.g., "20242025"

  @Column('uuid')
  homeRosterId: string;

  @Column('uuid')
  awayRosterId: string;

  @Column({ type: 'float', default: 0 })
  homeScore: number; // Total fantasy points for home team

  @Column({ type: 'float', default: 0 })
  awayScore: number; // Total fantasy points for away team

  @Column({ default: 'scheduled' })
  status: 'scheduled' | 'in_progress' | 'completed';

  @Column({ type: 'date' })
  weekStartDate: Date; // Monday of the matchup week

  @Column({ type: 'date' })
  weekEndDate: Date; // Sunday of the matchup week

  @ManyToOne(() => League)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @ManyToOne(() => Roster)
  @JoinColumn({ name: 'homeRosterId' })
  homeRoster: Roster;

  @ManyToOne(() => Roster)
  @JoinColumn({ name: 'awayRosterId' })
  awayRoster: Roster;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

