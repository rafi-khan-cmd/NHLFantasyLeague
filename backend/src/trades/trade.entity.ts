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
import { Roster } from '../rosters/roster.entity';
import { TradePlayer } from './trade-player.entity';

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column('uuid')
  proposingRosterId: string; // Team that proposed the trade

  @Column('uuid')
  receivingRosterId: string; // Team receiving the trade proposal

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Trade expires after 2 days

  @Column({ nullable: true })
  message: string; // Optional message from proposer

  @ManyToOne(() => League)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @ManyToOne(() => Roster)
  @JoinColumn({ name: 'proposingRosterId' })
  proposingRoster: Roster;

  @ManyToOne(() => Roster)
  @JoinColumn({ name: 'receivingRosterId' })
  receivingRoster: Roster;

  @OneToMany(() => TradePlayer, (tradePlayer) => tradePlayer.trade)
  players: TradePlayer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

