import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('roster_transactions')
@Index(['rosterId', 'weekStartDate'], { unique: false })
export class RosterTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  rosterId: string;

  @Column()
  userId: string;

  @Column()
  type: 'add' | 'drop'; // Transaction type

  @Column()
  nhlPlayerId: number;

  @Column()
  playerName: string;

  @Column({ type: 'date' })
  weekStartDate: Date; // Monday of the week (for weekly limits)

  @CreateDateColumn()
  createdAt: Date;
}

