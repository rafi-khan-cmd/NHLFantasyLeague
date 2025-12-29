import { IsString, IsNotEmpty, Length } from 'class-validator';

export class JoinLeagueDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 30)
  teamName: string;
}

