import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Length } from 'class-validator';

export class CreateLeagueDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  maxTeams?: number;
}

