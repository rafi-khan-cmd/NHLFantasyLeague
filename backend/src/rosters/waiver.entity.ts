import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('waivers')
@Index(['nhlPlayerId', 'leagueId'], { unique: false })
export class Waiver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column()
  nhlPlayerId: number;

  @Column()
  playerName: string;

  @Column()
  position: string;

  @Column()
  nhlTeam: string;

  @Column('uuid')
  droppedByRosterId: string; // Roster that dropped this player

  @Column({ type: 'timestamp' })
  waiverExpiresAt: Date; // When waiver period ends (usually 2 days)

  @Column({ default: 'pending' })
  status: 'pending' | 'claimed' | 'cleared'; // pending = on waivers, claimed = someone claimed, cleared = became free agent

  @Column('uuid', { nullable: true })
  claimedByRosterId: string | null; // Roster that claimed the player

  @CreateDateColumn()
  createdAt: Date;
}

