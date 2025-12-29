import { IsNumber, IsString, IsNotEmpty, IsOptional, Min, Max, Length, Matches } from 'class-validator';

export class AddPlayerDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  nhlPlayerId: number;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  playerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[FDG]$/, { message: 'Position must be F, D, or G' })
  position: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 5)
  nhlTeam: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;
}

