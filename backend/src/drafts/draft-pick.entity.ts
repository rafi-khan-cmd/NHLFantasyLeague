import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Draft } from './draft.entity';

@Entity('draft_picks')
export class DraftPick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  draftId: string;

  @Column('uuid')
  rosterId: string; // Team that made the pick

  @Column({ type: 'int' })
  pickNumber: number;

  @Column()
  nhlPlayerId: number;

  @Column()
  playerName: string;

  @Column()
  position: string;

  @Column()
  nhlTeam: string;

  @ManyToOne(() => Draft, (draft) => draft.picks)
  @JoinColumn({ name: 'draftId' })
  draft: Draft;

  @CreateDateColumn()
  createdAt: Date;
}

