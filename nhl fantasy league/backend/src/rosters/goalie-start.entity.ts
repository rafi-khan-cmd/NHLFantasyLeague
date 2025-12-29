import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('goalie_starts')
@Index(['rosterId', 'nhlPlayerId', 'nhlGameId'], { unique: true })
@Index(['rosterId', 'weekStartDate'])
export class GoalieStart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  rosterId: string;

  @Column()
  nhlPlayerId: number;

  @Column()
  nhlGameId: number;

  @Column({ type: 'date' })
  weekStartDate: Date; // Monday of the week

  @CreateDateColumn()
  createdAt: Date;
}

