import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1708000000000 implements MigrationInterface {
  name = 'InitialSchema1708000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_fav_comp" (
        "id" SERIAL NOT NULL,
        "competitionId" integer NOT NULL,
        "name" character varying NOT NULL,
        "emblem" character varying,
        "userId" integer,
        CONSTRAINT "PK_user_fav_comp" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_fav_team" (
        "id" SERIAL NOT NULL,
        "teamId" integer NOT NULL,
        "name" character varying NOT NULL,
        "crest" character varying,
        "userId" integer,
        CONSTRAINT "PK_user_fav_team" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_hidden_comp" (
        "id" SERIAL NOT NULL,
        "competitionId" integer NOT NULL,
        "name" character varying NOT NULL,
        "emblem" character varying,
        "userId" integer,
        CONSTRAINT "PK_user_hidden_comp" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user_fav_comp"
      ADD CONSTRAINT "FK_user_fav_comp_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_fav_team"
      ADD CONSTRAINT "FK_user_fav_team_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_hidden_comp"
      ADD CONSTRAINT "FK_user_hidden_comp_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_hidden_comp" DROP CONSTRAINT "FK_user_hidden_comp_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_fav_team" DROP CONSTRAINT "FK_user_fav_team_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_fav_comp" DROP CONSTRAINT "FK_user_fav_comp_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_hidden_comp"`);
    await queryRunner.query(`DROP TABLE "user_fav_team"`);
    await queryRunner.query(`DROP TABLE "user_fav_comp"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
