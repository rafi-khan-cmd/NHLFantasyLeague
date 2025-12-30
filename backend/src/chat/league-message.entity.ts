import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { League } from '../leagues/league.entity';
import { User } from '../auth/user.entity';

@Entity('league_messages')
@Index(['leagueId', 'createdAt'])
export class LeagueMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leagueId: string;

  @Column('uuid')
  userId: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  replyToId: string; // For threaded replies

  @Column({ default: false })
  isPinned: boolean; // Commissioner can pin messages

  @Column({ default: false })
  isAnnouncement: boolean; // Commissioner announcements

  @ManyToOne(() => League)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

