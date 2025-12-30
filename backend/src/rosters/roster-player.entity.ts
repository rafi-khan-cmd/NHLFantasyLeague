import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Roster } from './roster.entity';

@Entity('roster_players')
export class RosterPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  rosterId: string;

  @Column()
  nhlPlayerId: number;

  @Column()
  playerName: string;

  @Column()
  position: string; // F, D, G

  @Column()
  nhlTeam: string; // Team abbreviation

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  salary: number; // Player salary in dollars

  @Column({ default: 'bench' })
  lineupStatus: 'active' | 'bench' | 'ir'; // Active lineup, bench, or injured reserve

  @ManyToOne(() => Roster, (roster) => roster.players)
  @JoinColumn({ name: 'rosterId' })
  roster: Roster;

  @CreateDateColumn()
  createdAt: Date;
}

