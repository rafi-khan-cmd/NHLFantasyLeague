import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('scoring_events')
@Index(['nhlEventId', 'nhlPlayerId'], { unique: true })
export class ScoringEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nhlEventId: string; // From play-by-play eventId for idempotency

  @Column()
  nhlGameId: number;

  @Column()
  nhlPlayerId: number;

  @Column('uuid')
  rosterId: string;

  @Column('uuid')
  leagueId: string;

  @Column()
  eventType: string; // goal, assist, shot, hit, block, etc.

  @Column({ type: 'float', default: 0 })
  pointsAwarded: number;

  @Column({ type: 'jsonb', nullable: true })
  eventData: {
    period: number;
    timeRemaining: string;
    description: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}

