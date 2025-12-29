import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trade } from './trade.entity';

@Entity('trade_players')
export class TradePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tradeId: string;

  @Column('uuid')
  fromRosterId: string; // Roster giving up this player

  @Column('uuid')
  toRosterId: string; // Roster receiving this player

  @Column()
  nhlPlayerId: number;

  @Column()
  playerName: string;

  @Column()
  position: string;

  @Column()
  nhlTeam: string;

  @ManyToOne(() => Trade, (trade) => trade.players)
  @JoinColumn({ name: 'tradeId' })
  trade: Trade;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

