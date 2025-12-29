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
import { RosterPlayer } from './roster-player.entity';

@Entity('rosters')
export class Roster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column()
  teamName: string;

  @Column({ unique: true })
  ownerId: string; // User ID - unique constraint ensures one roster per user

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 95500000 })
  salaryCap: number; // Team salary cap in dollars (default $95.5M for 2025-26 season)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSalary: number; // Current total salary of all players

  @Column({ default: false })
  rosterAnnounced: boolean; // Whether the roster has been announced/locked

  @Column({ type: 'timestamp', nullable: true })
  rosterAnnouncedAt: Date | null; // When the roster was announced

  @ManyToOne(() => League, (league) => league.rosters, { nullable: false })
  @JoinColumn({ name: 'leagueId' })
  league?: League;

  @OneToMany(() => RosterPlayer, (player) => player.roster, { cascade: true })
  players: RosterPlayer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

