import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueOwnerIdConstraint1766910563055 implements MigrationInterface {
    name = 'AddUniqueOwnerIdConstraint1766910563055'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rosters" ADD CONSTRAINT "UQ_fbf15298456ac007a1d5bf264ff" UNIQUE ("ownerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rosters" DROP CONSTRAINT "UQ_fbf15298456ac007a1d5bf264ff"`);
    }

}
