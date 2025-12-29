import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddEmailVerificationTable1735516800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'code',
            type: 'varchar',
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'email_verifications',
      new TableIndex({
        name: 'IDX_email_verifications_email_code',
        columnNames: ['email', 'code'],
      }),
    );

    await queryRunner.createIndex(
      'email_verifications',
      new TableIndex({
        name: 'IDX_email_verifications_email_verified',
        columnNames: ['email', 'verified'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_verifications');
  }
}

